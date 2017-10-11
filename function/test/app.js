import Router from './router.js';
import HomePage from './components/home-page.js';
import BuildPage from './components/build-page.js';
import store from './store';

new Vue({
  router: Router,
  store: store,
  components: {
    'home-page': HomePage,
    'build-page': BuildPage
  },
  created() {
    this.$store.dispatch('getBuilds');
  }
}).$mount('#app');