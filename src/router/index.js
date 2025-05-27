import { createRouter, createWebHistory } from 'vue-router';
import LibraryView from '../views/LibraryView.vue';
import ReaderView from '../views/ReaderView.vue';

const routes = [
  {
    path: '/',
    name: 'Library',
    component: LibraryView,
  },
  {
    path: '/read/:bookId',
    name: 'Reader',
    component: ReaderView,
    props: true, // Pass route params as props to ReaderView
  },
  // Add other routes here if needed
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router; 