app.filter('showdown', function () {
  return function (markdown) {
    if (markdown) {
      var showdown = new Showdown.converter();
      return showdown.makeHtml(markdown);
    } else {
      return '';
    }
  };
});

app.filter('fromNow', function () {
  return function (date) {
    return moment(date).fromNow();
  };
});