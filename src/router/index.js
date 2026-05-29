import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import AdminView from '@/views/AdminView.vue'
import UserView from '@/views/UserView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/user',
    name: 'user',
    component: UserView,
    meta: { requiresAuth: true, role: 'user' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

function roleHome(user) {
  return user?.role === 'admin' ? { name: 'admin' } : { name: 'user' }
}

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  if (to.name === 'login' && auth.isLoggedIn) {
    next(roleHome(auth.user))
    return
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next({ name: 'login' })
    return
  }

  if (to.meta.role && auth.user?.role !== to.meta.role) {
    next(roleHome(auth.user))
    return
  }

  next()
})

export default router
