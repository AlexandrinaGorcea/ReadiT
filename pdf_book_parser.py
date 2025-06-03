import pdfplumber
import json
import argparse
import os
import re

def generate_book_id(title):
    # Convert to lowercase
    s = title.lower()
    # Remove punctuation and special characters (allow letters, numbers, spaces, hyphens)
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    # Replace spaces with hyphens
    s = re.sub(r'\s+', '-', s)
    # Remove leading/trailing hyphens
    s = s.strip('-')
    return s

def parse_pdf_to_json(pdf_path, json_output_path, book_id, title, author, year, cover_image_path):
    """
    Parses a PDF file and converts its content to a structured JSON file.

    Args:
        pdf_path (str): Path to the input PDF file.
        json_output_path (str): Path to save the output JSON file.
        book_id (str): Unique ID for the book (e.g., 'romeo-and-juliet').
        title (str): Title of the book.
        author (str): Author of the book.
        year (int): Publication year of the book.
        cover_image_path (str): Path to the cover image (e.g., '/images/covers/cover.jpg').
    """
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return

    book_data = {
        "id": book_id if book_id else generate_book_id(title),
        "title": title,
        "author": author,
        "year": int(year) if year else None,
        "coverImage": cover_image_path,
        "content": []
    }

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page_obj in enumerate(pdf.pages):
                page_text = page_obj.extract_text()
                if page_text: # Ensure there's text on the page
                    book_data["content"].append({
                        "page_content": page_text.strip(),
                        "page": i + 1
                    })
                else:
                    # Handle blank pages or pages with no extractable text if necessary
                    book_data["content"].append({
                        "page_content": "", # Or some placeholder
                        "page": i + 1
                    })
        
        # Ensure the output directory exists
        output_dir = os.path.dirname(json_output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)

        with open(json_output_path, 'w', encoding='utf-8') as f:
            json.dump(book_data, f, indent=2, ensure_ascii=False)
        
        print(f"Successfully parsed '{title}' and saved to {json_output_path}")

    except Exception as e:
        print(f"An error occurred while processing {pdf_path}: {e}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Parse a PDF book and convert it to JSON.")
    parser.add_argument("pdf_path", help="Path to the input PDF file.")
    parser.add_argument("json_output_path", help="Path for the output JSON file.")
    
    parser.add_argument("--id", help="Unique ID for the book. If not provided, it will be generated from the title.")
    parser.add_argument("--title", required=True, help="Title of the book.")
    parser.add_argument("--author", required=True, help="Author of the book.")
    parser.add_argument("--year", type=int, help="Publication year of the book.")
    parser.add_argument("--cover", required=True, help="Path to the cover image (e.g., /images/covers/cover.jpg).")

    args = parser.parse_args()

    parse_pdf_to_json(
        args.pdf_path,
        args.json_output_path,
        args.id,
        args.title,
        args.author,
        args.year,
        args.cover
    )

    # --- Example Usage (comment out or remove when using CLI) ---
    # Make sure the example paths are correct relative to where you run the script.
    # Assuming 'readit-app' is the current working directory when running this script.
    
    # Example 1: Romeo and Juliet
    # pdf_file_rj = os.path.join('public', 'books', 'books_pdf', 'Romeo and Juliet.pdf')
    # json_file_rj = os.path.join('public', 'books', 'romeo-and-juliet.json')
    # if os.path.exists(pdf_file_rj):
    #     parse_pdf_to_json(
    #         pdf_path=pdf_file_rj,
    #         json_output_path=json_file_rj,
    #         book_id='romeo-and-juliet',
    #         title='Romeo and Juliet',
    #         author='William Shakespeare',
    #         year=1597,
    #         cover_image_path='/images/covers/romeo-and-juliet-cover.jpg' # You'll need to create/find this image
    #     )
    # else:
    #     print(f"Example PDF not found: {pdf_file_rj}")

    # Example 2: Alice's Adventures in Wonderland
    # pdf_file_alice = os.path.join('public', 'books', 'books_pdf', 'Alices Adventures in Wonderland.pdf')
    # json_file_alice = os.path.join('public', 'books', 'alices-adventures-in-wonderland.json')
    # if os.path.exists(pdf_file_alice):
    #     parse_pdf_to_json(
    #         pdf_path=pdf_file_alice,
    #         json_output_path=json_file_alice,
    #         book_id='alices-adventures-in-wonderland',
    #         title="Alice's Adventures in Wonderland",
    #         author='Lewis Carroll',
    #         year=1865,
    #         cover_image_path='/images/covers/alices-adventures-in-wonderland-cover.jpg' # Create/find this image
    #     )
    # else:
    #     print(f"Example PDF not found: {pdf_file_alice}") 