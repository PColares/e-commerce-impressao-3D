import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'
import { adminRedirect } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/orcamento',
      redirect: { path: '/', hash: '#orcamento' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/registro',
      name: 'registro',
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      path: '/catalogo',
      name: 'catalogo',
      component: () => import('@/views/CatalogoView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAdmin: true },
    },
  ],
  scrollBehavior(to, _from, savedPosition) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return savedPosition ?? { top: 0 }
  },
})

router.beforeEach((to) =>
  adminRedirect({ requiresAdmin: to.meta.requiresAdmin === true, fullPath: to.fullPath }, useAuthStore().user),
)

export default router
