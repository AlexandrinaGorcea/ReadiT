import json
import re
from pathlib import Path
import argparse
from typing import Dict, List, Any

try:
    import PyPDF2
    import pdfplumber
except ImportError:
    print("Required libraries not found. Installing...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2", "pdfplumber"])
    import PyPDF2
    import pdfplumber

# Try to import OCR libraries for scanned PDFs
try:
    import pytesseract
    from PIL import Image
    import pdf2image
    OCR_AVAILABLE = True
    print("OCR libraries available - can handle scanned PDFs")
except ImportError:
    OCR_AVAILABLE = False
    print("OCR libraries not available - scanned PDFs may not work well")

def clean_text(text: str) -> str:
    """Clean and normalize extracted text."""
    # Remove excessive whitespace and normalize line breaks
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    return text

def extract_title_from_filename(filename: str) -> str:
    """Extract a readable title from filename."""
    # Remove extension and replace underscores/hyphens with spaces
    title = Path(filename).stem
    title = re.sub(r'[_-]', ' ', title)
    title = title.title()
    return title

def create_book_id(title: str) -> str:
    """Create a URL-friendly ID from the title."""
    # Convert to lowercase, replace spaces with hyphens, remove special chars
    book_id = re.sub(r'[^\w\s-]', '', title.lower())
    book_id = re.sub(r'[-\s]+', '-', book_id)
    return book_id.strip('-')

def extract_metadata_from_text(text: str, filename: str) -> Dict[str, Any]:
    """Try to extract basic metadata from the text."""
    # Default values
    title = extract_title_from_filename(filename)
    author = "Unknown Author"
    year = None
    
    # Try to find author patterns (basic heuristics)
    author_patterns = [
        r'by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        r'Author:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        r'Written by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
    ]
    
    for pattern in author_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            author = match.group(1)
            break
    
    # Try to find year patterns
    year_patterns = [
        r'(?:copyright|©|\(c\))\s*(\d{4})',
        r'published\s+(?:in\s+)?(\d{4})',
        r'\b(19\d{2}|20\d{2})\b'
    ]
    
    for pattern in year_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            # Take the first reasonable year found
            for match in matches:
                year_val = int(match)
                if 1400 <= year_val <= 2030:  # Reasonable year range for books
                    year = year_val
                    break
            if year:
                break
    
    return {
        'title': title,
        'author': author,
        'year': year
    }

def split_page_content(text: str, max_length: int = 1000) -> List[str]:
    """Split page content into manageable chunks."""
    if len(text) <= max_length:
        return [text]
    
    # Try to split at sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= max_length:
            current_chunk += sentence + " "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + " "
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def extract_text_with_ocr(pdf_path: str, page_num: int) -> str:
    """Extract text using OCR for scanned PDFs."""
    if not OCR_AVAILABLE:
        return ""
    
    try:
        # Convert PDF page to image
        images = pdf2image.convert_from_path(pdf_path, first_page=page_num, last_page=page_num)
        if images:
            # Use OCR to extract text
            text = pytesseract.image_to_string(images[0])
            return text
    except Exception as e:
        print(f"OCR failed for page {page_num}: {e}")
    
    return ""

def extract_text_multiple_methods(pdf_path: str, page, page_num: int) -> str:
    """Try multiple methods to extract text from a PDF page."""
    text = ""
    
    # Method 1: PyPDF2
    try:
        text = page.extract_text()
        if text and len(text.strip()) > 50:  # Good amount of text extracted
            return clean_text(text)
    except Exception as e:
        print(f"PyPDF2 extraction failed for page {page_num}: {e}")
    
    # Method 2: pdfplumber (better for complex layouts)
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if page_num <= len(pdf.pages):
                plumber_page = pdf.pages[page_num - 1]
                text = plumber_page.extract_text()
                if text and len(text.strip()) > 50:
                    return clean_text(text)
    except Exception as e:
        print(f"pdfplumber extraction failed for page {page_num}: {e}")
    
    # Method 3: OCR (for scanned PDFs)
    if OCR_AVAILABLE and (not text or len(text.strip()) < 50):
        print(f"Trying OCR for page {page_num}...")
        ocr_text = extract_text_with_ocr(pdf_path, page_num)
        if ocr_text and len(ocr_text.strip()) > 50:
            return clean_text(ocr_text)
    
    # Return whatever we got, even if minimal
    return clean_text(text) if text else ""

def check_pdf_compatibility(pdf_path: str) -> Dict[str, Any]:
    """Check PDF compatibility and provide recommendations."""
    compatibility_info = {
        'is_encrypted': False,
        'has_text': False,
        'likely_scanned': False,
        'total_pages': 0,
        'recommendations': []
    }
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            compatibility_info['total_pages'] = len(pdf_reader.pages)
            
            # Check if encrypted
            if pdf_reader.is_encrypted:
                compatibility_info['is_encrypted'] = True
                compatibility_info['recommendations'].append("PDF is encrypted - may need password")
                return compatibility_info
            
            # Sample first few pages to check text content
            sample_pages = min(3, len(pdf_reader.pages))
            total_text_length = 0
            
            for i in range(sample_pages):
                try:
                    text = pdf_reader.pages[i].extract_text()
                    total_text_length += len(text.strip())
                except:
                    continue
            
            # Determine if PDF has extractable text
            avg_text_per_page = total_text_length / sample_pages if sample_pages > 0 else 0
            
            if avg_text_per_page > 100:
                compatibility_info['has_text'] = True
            elif avg_text_per_page < 50:
                compatibility_info['likely_scanned'] = True
                if OCR_AVAILABLE:
                    compatibility_info['recommendations'].append("Likely scanned PDF - will use OCR")
                else:
                    compatibility_info['recommendations'].append("Likely scanned PDF - install OCR libraries for better results")
            
    except Exception as e:
        compatibility_info['recommendations'].append(f"Error checking PDF: {e}")
    
    return compatibility_info

def parse_pdf_to_json(pdf_path: str, output_path: str = None, 
                     cover_image_path: str = None, chunk_pages: bool = False,
                     check_compatibility: bool = True) -> Dict[str, Any]:
    """
    Parse a PDF book and convert it to the specified JSON format.
    
    Args:
        pdf_path: Path to the PDF file
        output_path: Path to save the JSON file (optional)
        cover_image_path: Path to cover image (optional)
        chunk_pages: Whether to split long pages into chunks
    
    Returns:
        Dictionary containing the parsed book data
    """
    
    try:
        # Check PDF compatibility first
        if check_compatibility:
            compat_info = check_pdf_compatibility(pdf_path)
            print(f"PDF Analysis:")
            print(f"- Total pages: {compat_info['total_pages']}")
            print(f"- Has extractable text: {compat_info['has_text']}")
            print(f"- Likely scanned: {compat_info['likely_scanned']}")
            print(f"- Encrypted: {compat_info['is_encrypted']}")
            
            for rec in compat_info['recommendations']:
                print(f"- {rec}")
            print()
            
            if compat_info['is_encrypted']:
                print("Cannot process encrypted PDF without password.")
                return None
        
        # Open and read the PDF
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            # Extract text from all pages
            all_text = ""
            page_contents = []
            failed_pages = []
            
            print(f"Processing {len(pdf_reader.pages)} pages...")
            
            for page_num, page in enumerate(pdf_reader.pages, 1):
                try:
                    # Use multiple extraction methods
                    page_text = extract_text_multiple_methods(pdf_path, page, page_num)
                    
                    if page_text and len(page_text.strip()) > 10:  # Only add pages with meaningful content
                        all_text += page_text + " "
                        
                        if chunk_pages and len(page_text) > 1000:
                            # Split long pages into chunks
                            chunks = split_page_content(page_text)
                            for i, chunk in enumerate(chunks):
                                page_contents.append({
                                    "page_content": chunk,
                                    "page": f"{page_num}.{i+1}" if len(chunks) > 1 else page_num
                                })
                        else:
                            page_contents.append({
                                "page_content": page_text,
                                "page": page_num
                            })
                    else:
                        failed_pages.append(page_num)
                        print(f"Warning: Little/no text extracted from page {page_num}")
                    
                    # Progress indicator
                    if page_num % 10 == 0:
                        print(f"Processed {page_num} pages...")
                        
                except Exception as e:
                    print(f"Error processing page {page_num}: {e}")
                    failed_pages.append(page_num)
                    continue
            
            # Report results
            print(f"\nExtraction completed:")
            print(f"- Successfully processed: {len(page_contents)} pages")
            print(f"- Failed pages: {len(failed_pages)}")
            if failed_pages and len(failed_pages) < 20:
                print(f"- Failed page numbers: {failed_pages}")
            
            if not page_contents:
                print("No text could be extracted from this PDF.")
                if not OCR_AVAILABLE:
                    print("Try installing OCR libraries: pip install pytesseract pillow pdf2image")
                return None
            
            # Extract metadata
            filename = Path(pdf_path).name
            metadata = extract_metadata_from_text(all_text, filename)
            
            # Generate cover image path if not provided
            if not cover_image_path:
                book_id = create_book_id(metadata['title'])
                cover_image_path = f"/images/covers/{book_id}-cover.jpg"
            
            # Create the final JSON structure
            book_data = {
                "id": create_book_id(metadata['title']),
                "title": metadata['title'],
                "author": metadata['author'],
                "year": metadata['year'],
                "coverImage": cover_image_path,
                "content": page_contents
            }
            
            # Save to file if output path is specified
            if output_path:
                with open(output_path, 'w', encoding='utf-8') as json_file:
                    json.dump(book_data, json_file, indent=2, ensure_ascii=False)
                print(f"Book data saved to: {output_path}")
            
            return book_data
            
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return None

def main():
    """Command line interface for the PDF parser."""
    parser = argparse.ArgumentParser(description='Parse PDF books to JSON format')
    parser.add_argument('pdf_path', help='Path to the PDF file')
    parser.add_argument('-o', '--output', help='Output JSON file path')
    parser.add_argument('-c', '--cover', help='Cover image path')
    parser.add_argument('--chunk', action='store_true', 
                       help='Split long pages into smaller chunks')
    parser.add_argument('--no-check', action='store_true',
                       help='Skip PDF compatibility check')
    parser.add_argument('--install-ocr', action='store_true',
                       help='Install OCR libraries for scanned PDFs')
    parser.add_argument('--title', help='Override book title')
    parser.add_argument('--author', help='Override book author')
    parser.add_argument('--year', type=int, help='Override publication year')
    
    args = parser.parse_args()
    
    # Install OCR libraries if requested
    if args.install_ocr:
        print("Installing OCR libraries...")
        import subprocess
        import sys
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", 
                                 "pytesseract", "pillow", "pdf2image"])
            print("OCR libraries installed successfully!")
            print("Note: You may also need to install Tesseract OCR on your system:")
            print("- Windows: Download from GitHub releases")
            print("- macOS: brew install tesseract")
            print("- Linux: sudo apt-get install tesseract-ocr")
        except Exception as e:
            print(f"Failed to install OCR libraries: {e}")
        return
    
    # Set default output path if not provided
    if not args.output:
        pdf_name = Path(args.pdf_path).stem
        args.output = f"{pdf_name}.json"
    
    # Parse the PDF
    book_data = parse_pdf_to_json(
        args.pdf_path, 
        args.output, 
        args.cover,
        args.chunk,
        not args.no_check
    )
    
    if book_data:
        # Override metadata if provided
        if args.title:
            book_data['title'] = args.title
            book_data['id'] = create_book_id(args.title)
        if args.author:
            book_data['author'] = args.author
        if args.year:
            book_data['year'] = args.year
        
        # Save the updated data
        with open(args.output, 'w', encoding='utf-8') as json_file:
            json.dump(book_data, json_file, indent=2, ensure_ascii=False)
        
        print(f"\nSuccessfully parsed PDF!")
        print(f"Title: {book_data['title']}")
        print(f"Author: {book_data['author']}")
        print(f"Year: {book_data['year']}")
        print(f"Pages: {len(book_data['content'])}")
        print(f"Output: {args.output}")
    else:
        print("Failed to parse PDF.")

if __name__ == "__main__":
    main()

# Example usage:
# python pdf_parser.py "path/to/your/book.pdf"
# python pdf_parser.py "book.pdf" -o "my_book.json" --title "Custom Title" --author "Custom Author"