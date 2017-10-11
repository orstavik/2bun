export default Vue.component('build-page', {
  template:
  `<div id="buildBox" v-if="build">
      <div class="jumbotron" id="buildJumbotron">
        <h1 class="display-4">{{build.name}}</h1>
      </div>
      <div class="container">
        <h4>Components:</h4>
        <div class="component" v-for="component in build.components">
          <p><b>{{component.type}}:</b> - {{component.manufacturer}} {{component.name}}</p>
          <p>$ {{component.price}}</p>
        </div>
        <div class="component">
          <p><b>Total:</b></p>
          <p><b>$ {{buildPrice}}</b></p>
        </div>
      </div>
    </div>`,
  computed: {
    build() {
      return this.$store.getters.build(this.$route.params.id);
    },
    buildPrice() {
      let total = 0;
      this.build.components.forEach(c => {
        total += c.price;
      });
      return total;
    }
  }
})