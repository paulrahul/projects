import { createRouter, createWebHistory } from 'vue-router'
import Onebox from "../components/Onebox.vue"
import Product from "../components/Product.vue"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'onebox',
      component: Onebox
    },
    {
      path: '/:product_name',
      name: 'product',
      component: Product
    }
  ]
})

export default router
