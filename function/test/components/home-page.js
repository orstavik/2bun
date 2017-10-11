export default Vue.component('home-page', {
  template:
   `<div id="homeBox">
      <div class="jumbotron" id="homeJumbotron">
        <h1 class="display-4">Welcome to PCBuild!</h1>
      </div>
      <div class="container">
        <div class="row">
          <div class="col-md-4 build-cards" v-for="build in builds">
            <router-link class="h5" v-bind:to="'/build/'+build.publicId">{{ build.name }}</router-link>
          </div>
        </div>
      </div>
    </div>`,
  computed: {
    builds() {
      return this.$store.state.builds;
    }
  }
})