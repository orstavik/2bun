export default new Vuex.Store({
  state: {
    builds: []
  },
  getters: {
    build: (state) => (id) => {
      return state.builds.find(b => b.publicId === id);
    }
  },
  mutations: {
    updateBuilds(state, builds) {
      state.builds = builds;
    }
  },
  actions: {
    getBuilds(context) {
      fetch('/api/builds')
        .then((resp) => resp.json())
        .then((data) => context.commit('updateBuilds', data));
    }
  }
})