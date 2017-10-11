import HomePage from './components/home-page.js';
import BuildPage from './components/build-page.js';

const routes = [
  {
    path: '/',
    component: HomePage
  }, {
    path: '/build/:id',
    component: BuildPage
  }
]

export default new VueRouter({
  routes: routes,
});