<template lang='pug'>
sdiv
    <!-- Bild einbinden -->
    img(src="/img/kommitment.png" alt="kommitment")
    <!-- Schriftzug unter dem Bild -->
    div.k
      span @
      span.kcolor -
      br
      span &thinsp;KOMMITMENT
</template>

<style>
  img {
    width: 80%;
  } 
/* roboto-mono-regular - latin */
@font-face  {
  font-display: block; /* Check https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display for other options. */
  font-family: 'kommitment';
  src: url('/fonts/kommitment.woff2') format('woff2'); /* Chrome 36+, Opera 23+, Firefox 39+, Safari 12+, iOS 10+ */
}


.k  {
  font-display: block; /* Check https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display for other options. */
  font-family: 'kommitment';
  font-size: 10em;
  font-style: normal;
  text-align: center;
  font-weight: 400; 
}
.kcolor  {
  color: #55c5cd;
}


</style>