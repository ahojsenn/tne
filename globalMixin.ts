export default {
  methods: {
    // provide a ranom int number between min and max
    $getRandomInt: (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min,
    // delay b t Milliseconds
    $delay: (t: number) => {
      return new Promise(function (resolve) {
        setTimeout(resolve.bind(null), t)
      })
    }
  }
}