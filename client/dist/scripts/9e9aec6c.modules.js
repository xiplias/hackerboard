(function (window, angular, undefined) {
  'use strict';
  angular.module('ngResource', ['ng']).factory('$resource', [
    '$http',
    '$parse',
    function ($http, $parse) {
      var DEFAULT_ACTIONS = {
          'get': { method: 'GET' },
          'save': { method: 'POST' },
          'query': {
            method: 'GET',
            isArray: true
          },
          'remove': { method: 'DELETE' },
          'delete': { method: 'DELETE' }
        };
      var noop = angular.noop, forEach = angular.forEach, extend = angular.extend, copy = angular.copy, isFunction = angular.isFunction, getter = function (obj, path) {
          return $parse(path)(obj);
        };
      function encodeUriSegment(val) {
        return encodeUriQuery(val, true).replace(/%26/gi, '&').replace(/%3D/gi, '=').replace(/%2B/gi, '+');
      }
      function encodeUriQuery(val, pctEncodeSpaces) {
        return encodeURIComponent(val).replace(/%40/gi, '@').replace(/%3A/gi, ':').replace(/%24/g, '$').replace(/%2C/gi, ',').replace(/%20/g, pctEncodeSpaces ? '%20' : '+');
      }
      function Route(template, defaults) {
        this.template = template = template + '#';
        this.defaults = defaults || {};
        var urlParams = this.urlParams = {};
        forEach(template.split(/\W/), function (param) {
          if (param && new RegExp('(^|[^\\\\]):' + param + '\\W').test(template)) {
            urlParams[param] = true;
          }
        });
        this.template = template.replace(/\\:/g, ':');
      }
      Route.prototype = {
        url: function (params) {
          var self = this, url = this.template, val, encodedVal;
          params = params || {};
          forEach(this.urlParams, function (_, urlParam) {
            val = params.hasOwnProperty(urlParam) ? params[urlParam] : self.defaults[urlParam];
            if (angular.isDefined(val) && val !== null) {
              encodedVal = encodeUriSegment(val);
              url = url.replace(new RegExp(':' + urlParam + '(\\W)', 'g'), encodedVal + '$1');
            } else {
              url = url.replace(new RegExp('(/?):' + urlParam + '(\\W)', 'g'), function (match, leadingSlashes, tail) {
                if (tail.charAt(0) == '/') {
                  return tail;
                } else {
                  return leadingSlashes + tail;
                }
              });
            }
          });
          url = url.replace(/\/?#$/, '');
          var query = [];
          forEach(params, function (value, key) {
            if (!self.urlParams[key]) {
              query.push(encodeUriQuery(key) + '=' + encodeUriQuery(value));
            }
          });
          query.sort();
          url = url.replace(/\/*$/, '');
          return url + (query.length ? '?' + query.join('&') : '');
        }
      };
      function ResourceFactory(url, paramDefaults, actions) {
        var route = new Route(url);
        actions = extend({}, DEFAULT_ACTIONS, actions);
        function extractParams(data, actionParams) {
          var ids = {};
          actionParams = extend({}, paramDefaults, actionParams);
          forEach(actionParams, function (value, key) {
            ids[key] = value.charAt && value.charAt(0) == '@' ? getter(data, value.substr(1)) : value;
          });
          return ids;
        }
        function Resource(value) {
          copy(value || {}, this);
        }
        forEach(actions, function (action, name) {
          action.method = angular.uppercase(action.method);
          var hasBody = action.method == 'POST' || action.method == 'PUT' || action.method == 'PATCH';
          Resource[name] = function (a1, a2, a3, a4) {
            var params = {};
            var data;
            var success = noop;
            var error = null;
            switch (arguments.length) {
            case 4:
              error = a4;
              success = a3;
            case 3:
            case 2:
              if (isFunction(a2)) {
                if (isFunction(a1)) {
                  success = a1;
                  error = a2;
                  break;
                }
                success = a2;
                error = a3;
              } else {
                params = a1;
                data = a2;
                success = a3;
                break;
              }
            case 1:
              if (isFunction(a1))
                success = a1;
              else if (hasBody)
                data = a1;
              else
                params = a1;
              break;
            case 0:
              break;
            default:
              throw 'Expected between 0-4 arguments [params, data, success, error], got ' + arguments.length + ' arguments.';
            }
            var value = this instanceof Resource ? this : action.isArray ? [] : new Resource(data);
            $http({
              method: action.method,
              url: route.url(extend({}, extractParams(data, action.params || {}), params)),
              data: data
            }).then(function (response) {
              var data = response.data;
              if (data) {
                if (action.isArray) {
                  value.length = 0;
                  forEach(data, function (item) {
                    value.push(new Resource(item));
                  });
                } else {
                  copy(data, value);
                }
              }
              (success || noop)(value, response.headers);
            }, error);
            return value;
          };
          Resource.prototype['$' + name] = function (a1, a2, a3) {
            var params = extractParams(this), success = noop, error;
            switch (arguments.length) {
            case 3:
              params = a1;
              success = a2;
              error = a3;
              break;
            case 2:
            case 1:
              if (isFunction(a1)) {
                success = a1;
                error = a2;
              } else {
                params = a1;
                success = a2 || noop;
              }
            case 0:
              break;
            default:
              throw 'Expected between 1-3 arguments [params, success, error], got ' + arguments.length + ' arguments.';
            }
            var data = hasBody ? this : undefined;
            Resource[name].call(this, params, data, success, error);
          };
        });
        Resource.bind = function (additionalParamDefaults) {
          return ResourceFactory(url, extend({}, paramDefaults, additionalParamDefaults), actions);
        };
        return Resource;
      }
      return ResourceFactory;
    }
  ]);
}(window, window.angular));
(function (window, angular, undefined) {
  'use strict';
  angular.module('ngCookies', ['ng']).factory('$cookies', [
    '$rootScope',
    '$browser',
    function ($rootScope, $browser) {
      var cookies = {}, lastCookies = {}, lastBrowserCookies, runEval = false, copy = angular.copy, isUndefined = angular.isUndefined;
      $browser.addPollFn(function () {
        var currentCookies = $browser.cookies();
        if (lastBrowserCookies != currentCookies) {
          lastBrowserCookies = currentCookies;
          copy(currentCookies, lastCookies);
          copy(currentCookies, cookies);
          if (runEval)
            $rootScope.$apply();
        }
      })();
      runEval = true;
      $rootScope.$watch(push);
      return cookies;
      function push() {
        var name, value, browserCookies, updated;
        for (name in lastCookies) {
          if (isUndefined(cookies[name])) {
            $browser.cookies(name, undefined);
          }
        }
        for (name in cookies) {
          value = cookies[name];
          if (!angular.isString(value)) {
            if (angular.isDefined(lastCookies[name])) {
              cookies[name] = lastCookies[name];
            } else {
              delete cookies[name];
            }
          } else if (value !== lastCookies[name]) {
            $browser.cookies(name, value);
            updated = true;
          }
        }
        if (updated) {
          updated = false;
          browserCookies = $browser.cookies();
          for (name in cookies) {
            if (cookies[name] !== browserCookies[name]) {
              if (isUndefined(browserCookies[name])) {
                delete cookies[name];
              } else {
                cookies[name] = browserCookies[name];
              }
              updated = true;
            }
          }
        }
      }
    }
  ]).factory('$cookieStore', [
    '$cookies',
    function ($cookies) {
      return {
        get: function (key) {
          var value = $cookies[key];
          return value ? angular.fromJson(value) : value;
        },
        put: function (key, value) {
          $cookies[key] = angular.toJson(value);
        },
        remove: function (key) {
          delete $cookies[key];
        }
      };
    }
  ]);
}(window, window.angular));
(function (window, angular, undefined) {
  'use strict';
  var $sanitize = function (html) {
    var buf = [];
    htmlParser(html, htmlSanitizeWriter(buf));
    return buf.join('');
  };
  var START_TAG_REGEXP = /^<\s*([\w:-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)\s*>/, END_TAG_REGEXP = /^<\s*\/\s*([\w:-]+)[^>]*>/, ATTR_REGEXP = /([\w:-]+)(?:\s*=\s*(?:(?:"((?:[^"])*)")|(?:'((?:[^'])*)')|([^>\s]+)))?/g, BEGIN_TAG_REGEXP = /^</, BEGING_END_TAGE_REGEXP = /^<\s*\//, COMMENT_REGEXP = /<!--(.*?)-->/g, CDATA_REGEXP = /<!\[CDATA\[(.*?)]]>/g, URI_REGEXP = /^((ftp|https?):\/\/|mailto:|#)/, NON_ALPHANUMERIC_REGEXP = /([^\#-~| |!])/g;
  var voidElements = makeMap('area,br,col,hr,img,wbr');
  var optionalEndTagBlockElements = makeMap('colgroup,dd,dt,li,p,tbody,td,tfoot,th,thead,tr'), optionalEndTagInlineElements = makeMap('rp,rt'), optionalEndTagElements = angular.extend({}, optionalEndTagInlineElements, optionalEndTagBlockElements);
  var blockElements = angular.extend({}, optionalEndTagBlockElements, makeMap('address,article,aside,' + 'blockquote,caption,center,del,dir,div,dl,figure,figcaption,footer,h1,h2,h3,h4,h5,h6,' + 'header,hgroup,hr,ins,map,menu,nav,ol,pre,script,section,table,ul'));
  var inlineElements = angular.extend({}, optionalEndTagInlineElements, makeMap('a,abbr,acronym,b,bdi,bdo,' + 'big,br,cite,code,del,dfn,em,font,i,img,ins,kbd,label,map,mark,q,ruby,rp,rt,s,samp,small,' + 'span,strike,strong,sub,sup,time,tt,u,var'));
  var specialElements = makeMap('script,style');
  var validElements = angular.extend({}, voidElements, blockElements, inlineElements, optionalEndTagElements);
  var uriAttrs = makeMap('background,cite,href,longdesc,src,usemap');
  var validAttrs = angular.extend({}, uriAttrs, makeMap('abbr,align,alt,axis,bgcolor,border,cellpadding,cellspacing,class,clear,' + 'color,cols,colspan,compact,coords,dir,face,headers,height,hreflang,hspace,' + 'ismap,lang,language,nohref,nowrap,rel,rev,rows,rowspan,rules,' + 'scope,scrolling,shape,span,start,summary,target,title,type,' + 'valign,value,vspace,width'));
  function makeMap(str) {
    var obj = {}, items = str.split(','), i;
    for (i = 0; i < items.length; i++)
      obj[items[i]] = true;
    return obj;
  }
  function htmlParser(html, handler) {
    var index, chars, match, stack = [], last = html;
    stack.last = function () {
      return stack[stack.length - 1];
    };
    while (html) {
      chars = true;
      if (!stack.last() || !specialElements[stack.last()]) {
        if (html.indexOf('<!--') === 0) {
          index = html.indexOf('-->');
          if (index >= 0) {
            if (handler.comment)
              handler.comment(html.substring(4, index));
            html = html.substring(index + 3);
            chars = false;
          }
        } else if (BEGING_END_TAGE_REGEXP.test(html)) {
          match = html.match(END_TAG_REGEXP);
          if (match) {
            html = html.substring(match[0].length);
            match[0].replace(END_TAG_REGEXP, parseEndTag);
            chars = false;
          }
        } else if (BEGIN_TAG_REGEXP.test(html)) {
          match = html.match(START_TAG_REGEXP);
          if (match) {
            html = html.substring(match[0].length);
            match[0].replace(START_TAG_REGEXP, parseStartTag);
            chars = false;
          }
        }
        if (chars) {
          index = html.indexOf('<');
          var text = index < 0 ? html : html.substring(0, index);
          html = index < 0 ? '' : html.substring(index);
          if (handler.chars)
            handler.chars(decodeEntities(text));
        }
      } else {
        html = html.replace(new RegExp('(.*)<\\s*\\/\\s*' + stack.last() + '[^>]*>', 'i'), function (all, text) {
          text = text.replace(COMMENT_REGEXP, '$1').replace(CDATA_REGEXP, '$1');
          if (handler.chars)
            handler.chars(decodeEntities(text));
          return '';
        });
        parseEndTag('', stack.last());
      }
      if (html == last) {
        throw 'Parse Error: ' + html;
      }
      last = html;
    }
    parseEndTag();
    function parseStartTag(tag, tagName, rest, unary) {
      tagName = angular.lowercase(tagName);
      if (blockElements[tagName]) {
        while (stack.last() && inlineElements[stack.last()]) {
          parseEndTag('', stack.last());
        }
      }
      if (optionalEndTagElements[tagName] && stack.last() == tagName) {
        parseEndTag('', tagName);
      }
      unary = voidElements[tagName] || !!unary;
      if (!unary)
        stack.push(tagName);
      var attrs = {};
      rest.replace(ATTR_REGEXP, function (match, name, doubleQuotedValue, singleQoutedValue, unqoutedValue) {
        var value = doubleQuotedValue || singleQoutedValue || unqoutedValue || '';
        attrs[name] = decodeEntities(value);
      });
      if (handler.start)
        handler.start(tagName, attrs, unary);
    }
    function parseEndTag(tag, tagName) {
      var pos = 0, i;
      tagName = angular.lowercase(tagName);
      if (tagName)
        for (pos = stack.length - 1; pos >= 0; pos--)
          if (stack[pos] == tagName)
            break;
      if (pos >= 0) {
        for (i = stack.length - 1; i >= pos; i--)
          if (handler.end)
            handler.end(stack[i]);
        stack.length = pos;
      }
    }
  }
  var hiddenPre = document.createElement('pre');
  function decodeEntities(value) {
    hiddenPre.innerHTML = value.replace(/</g, '&lt;');
    return hiddenPre.innerText || hiddenPre.textContent || '';
  }
  function encodeEntities(value) {
    return value.replace(/&/g, '&amp;').replace(NON_ALPHANUMERIC_REGEXP, function (value) {
      return '&#' + value.charCodeAt(0) + ';';
    }).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function htmlSanitizeWriter(buf) {
    var ignore = false;
    var out = angular.bind(buf, buf.push);
    return {
      start: function (tag, attrs, unary) {
        tag = angular.lowercase(tag);
        if (!ignore && specialElements[tag]) {
          ignore = tag;
        }
        if (!ignore && validElements[tag] == true) {
          out('<');
          out(tag);
          angular.forEach(attrs, function (value, key) {
            var lkey = angular.lowercase(key);
            if (validAttrs[lkey] == true && (uriAttrs[lkey] !== true || value.match(URI_REGEXP))) {
              out(' ');
              out(key);
              out('="');
              out(encodeEntities(value));
              out('"');
            }
          });
          out(unary ? '/>' : '>');
        }
      },
      end: function (tag) {
        tag = angular.lowercase(tag);
        if (!ignore && validElements[tag] == true) {
          out('</');
          out(tag);
          out('>');
        }
        if (tag == ignore) {
          ignore = false;
        }
      },
      chars: function (chars) {
        if (!ignore) {
          out(encodeEntities(chars));
        }
      }
    };
  }
  angular.module('ngSanitize', []).value('$sanitize', $sanitize);
  angular.module('ngSanitize').directive('ngBindHtml', [
    '$sanitize',
    function ($sanitize) {
      return function (scope, element, attr) {
        element.addClass('ng-binding').data('$binding', attr.ngBindHtml);
        scope.$watch(attr.ngBindHtml, function ngBindHtmlWatchAction(value) {
          value = $sanitize(value);
          element.html(value || '');
        });
      };
    }
  ]);
  angular.module('ngSanitize').filter('linky', function () {
    var LINKY_URL_REGEXP = /((ftp|https?):\/\/|(mailto:)?[A-Za-z0-9._%+-]+@)\S*[^\s\.\;\,\(\)\{\}\<\>]/, MAILTO_REGEXP = /^mailto:/;
    return function (text) {
      if (!text)
        return text;
      var match;
      var raw = text;
      var html = [];
      var writer = htmlSanitizeWriter(html);
      var url;
      var i;
      while (match = raw.match(LINKY_URL_REGEXP)) {
        url = match[0];
        if (match[2] == match[3])
          url = 'mailto:' + url;
        i = match.index;
        writer.chars(raw.substr(0, i));
        writer.start('a', { href: url });
        writer.chars(match[0].replace(MAILTO_REGEXP, ''));
        writer.end('a');
        raw = raw.substring(i + match[0].length);
      }
      writer.chars(raw);
      return html.join('');
    };
  });
}(window, window.angular));
angular.module('ui.bootstrap', [
  'ui.bootstrap.tpls',
  'ui.bootstrap.transition',
  'ui.bootstrap.collapse',
  'ui.bootstrap.accordion',
  'ui.bootstrap.alert',
  'ui.bootstrap.buttons',
  'ui.bootstrap.carousel',
  'ui.bootstrap.datepicker',
  'ui.bootstrap.dialog',
  'ui.bootstrap.dropdownToggle',
  'ui.bootstrap.modal',
  'ui.bootstrap.pagination',
  'ui.bootstrap.position',
  'ui.bootstrap.tooltip',
  'ui.bootstrap.popover',
  'ui.bootstrap.progressbar',
  'ui.bootstrap.rating',
  'ui.bootstrap.tabs',
  'ui.bootstrap.timepicker',
  'ui.bootstrap.typeahead'
]), angular.module('ui.bootstrap.tpls', [
  'template/accordion/accordion-group.html',
  'template/accordion/accordion.html',
  'template/alert/alert.html',
  'template/carousel/carousel.html',
  'template/carousel/slide.html',
  'template/datepicker/datepicker.html',
  'template/dialog/message.html',
  'template/pagination/pager.html',
  'template/pagination/pagination.html',
  'template/tooltip/tooltip-html-unsafe-popup.html',
  'template/tooltip/tooltip-popup.html',
  'template/popover/popover.html',
  'template/progressbar/bar.html',
  'template/progressbar/progress.html',
  'template/rating/rating.html',
  'template/tabs/tab.html',
  'template/tabs/tabset.html',
  'template/timepicker/timepicker.html',
  'template/typeahead/typeahead.html'
]), angular.module('ui.bootstrap.transition', []).factory('$transition', [
  '$q',
  '$timeout',
  '$rootScope',
  function (e, t, n) {
    function a(e) {
      for (var t in e)
        if (void 0 !== i.style[t])
          return e[t];
    }
    var o = function (a, i, r) {
        r = r || {};
        var l = e.defer(), s = o[r.animation ? 'animationEndEventName' : 'transitionEndEventName'], c = function () {
            n.$apply(function () {
              a.unbind(s, c), l.resolve(a);
            });
          };
        return s && a.bind(s, c), t(function () {
          angular.isString(i) ? a.addClass(i) : angular.isFunction(i) ? i(a) : angular.isObject(i) && a.css(i), s || l.resolve(a);
        }), l.promise.cancel = function () {
          s && a.unbind(s, c), l.reject('Transition cancelled');
        }, l.promise;
      }, i = document.createElement('trans'), r = {
        WebkitTransition: 'webkitTransitionEnd',
        MozTransition: 'transitionend',
        OTransition: 'oTransitionEnd',
        transition: 'transitionend'
      }, l = {
        WebkitTransition: 'webkitAnimationEnd',
        MozTransition: 'animationend',
        OTransition: 'oAnimationEnd',
        transition: 'animationend'
      };
    return o.transitionEndEventName = a(r), o.animationEndEventName = a(l), o;
  }
]), angular.module('ui.bootstrap.collapse', ['ui.bootstrap.transition']).directive('collapse', [
  '$transition',
  function (e) {
    var t = function (e, t, n) {
      t.removeClass('collapse'), t.css({ height: n }), t[0].offsetWidth, t.addClass('collapse');
    };
    return {
      link: function (n, a, o) {
        var i, r = !0;
        n.$watch(function () {
          return a[0].scrollHeight;
        }, function () {
          0 !== a[0].scrollHeight && (i || (r ? t(n, a, a[0].scrollHeight + 'px') : t(n, a, 'auto')));
        }), n.$watch(o.collapse, function (e) {
          e ? u() : c();
        });
        var l, s = function (t) {
            return l && l.cancel(), l = e(a, t), l.then(function () {
              l = void 0;
            }, function () {
              l = void 0;
            }), l;
          }, c = function () {
            r ? (r = !1, i || t(n, a, 'auto')) : s({ height: a[0].scrollHeight + 'px' }).then(function () {
              i || t(n, a, 'auto');
            }), i = !1;
          }, u = function () {
            i = !0, r ? (r = !1, t(n, a, 0)) : (t(n, a, a[0].scrollHeight + 'px'), s({ height: '0' }));
          };
      }
    };
  }
]), angular.module('ui.bootstrap.accordion', ['ui.bootstrap.collapse']).constant('accordionConfig', { closeOthers: !0 }).controller('AccordionController', [
  '$scope',
  '$attrs',
  'accordionConfig',
  function (e, t, n) {
    this.groups = [], this.closeOthers = function (a) {
      var o = angular.isDefined(t.closeOthers) ? e.$eval(t.closeOthers) : n.closeOthers;
      o && angular.forEach(this.groups, function (e) {
        e !== a && (e.isOpen = !1);
      });
    }, this.addGroup = function (e) {
      var t = this;
      this.groups.push(e), e.$on('$destroy', function () {
        t.removeGroup(e);
      });
    }, this.removeGroup = function (e) {
      var t = this.groups.indexOf(e);
      -1 !== t && this.groups.splice(this.groups.indexOf(e), 1);
    };
  }
]).directive('accordion', function () {
  return {
    restrict: 'EA',
    controller: 'AccordionController',
    transclude: !0,
    replace: !1,
    templateUrl: 'template/accordion/accordion.html'
  };
}).directive('accordionGroup', [
  '$parse',
  '$transition',
  '$timeout',
  function (e) {
    return {
      require: '^accordion',
      restrict: 'EA',
      transclude: !0,
      replace: !0,
      templateUrl: 'template/accordion/accordion-group.html',
      scope: { heading: '@' },
      controller: [
        '$scope',
        function () {
          this.setHeading = function (e) {
            this.heading = e;
          };
        }
      ],
      link: function (t, n, a, o) {
        var i, r;
        o.addGroup(t), t.isOpen = !1, a.isOpen && (i = e(a.isOpen), r = i.assign, t.$watch(function () {
          return i(t.$parent);
        }, function (e) {
          t.isOpen = e;
        }), t.isOpen = i ? i(t.$parent) : !1), t.$watch('isOpen', function (e) {
          e && o.closeOthers(t), r && r(t.$parent, e);
        });
      }
    };
  }
]).directive('accordionHeading', function () {
  return {
    restrict: 'EA',
    transclude: !0,
    template: '',
    replace: !0,
    require: '^accordionGroup',
    compile: function (e, t, n) {
      return function (e, t, a, o) {
        o.setHeading(n(e, function () {
        }));
      };
    }
  };
}).directive('accordionTransclude', function () {
  return {
    require: '^accordionGroup',
    link: function (e, t, n, a) {
      e.$watch(function () {
        return a[n.accordionTransclude];
      }, function (e) {
        e && (t.html(''), t.append(e));
      });
    }
  };
}), angular.module('ui.bootstrap.alert', []).directive('alert', function () {
  return {
    restrict: 'EA',
    templateUrl: 'template/alert/alert.html',
    transclude: !0,
    replace: !0,
    scope: {
      type: '=',
      close: '&'
    },
    link: function (e, t, n) {
      e.closeable = 'close' in n;
    }
  };
}), angular.module('ui.bootstrap.buttons', []).constant('buttonConfig', {
  activeClass: 'active',
  toggleEvent: 'click'
}).directive('btnRadio', [
  'buttonConfig',
  function (e) {
    var t = e.activeClass || 'active', n = e.toggleEvent || 'click';
    return {
      require: 'ngModel',
      link: function (e, a, o, i) {
        i.$render = function () {
          a.toggleClass(t, angular.equals(i.$modelValue, e.$eval(o.btnRadio)));
        }, a.bind(n, function () {
          a.hasClass(t) || e.$apply(function () {
            i.$setViewValue(e.$eval(o.btnRadio)), i.$render();
          });
        });
      }
    };
  }
]).directive('btnCheckbox', [
  'buttonConfig',
  function (e) {
    var t = e.activeClass || 'active', n = e.toggleEvent || 'click';
    return {
      require: 'ngModel',
      link: function (e, a, o, i) {
        var r = e.$eval(o.btnCheckboxTrue), l = e.$eval(o.btnCheckboxFalse);
        r = angular.isDefined(r) ? r : !0, l = angular.isDefined(l) ? l : !1, i.$render = function () {
          a.toggleClass(t, angular.equals(i.$modelValue, r));
        }, a.bind(n, function () {
          e.$apply(function () {
            i.$setViewValue(a.hasClass(t) ? l : r), i.$render();
          });
        });
      }
    };
  }
]), angular.module('ui.bootstrap.carousel', ['ui.bootstrap.transition']).controller('CarouselController', [
  '$scope',
  '$timeout',
  '$transition',
  '$q',
  function (e, t, n) {
    function a() {
      function n() {
        i ? (e.next(), a()) : e.pause();
      }
      o && t.cancel(o);
      var r = +e.interval;
      !isNaN(r) && r >= 0 && (o = t(n, r));
    }
    var o, i, r = this, l = r.slides = [], s = -1;
    r.currentSlide = null, r.select = function (o, i) {
      function c() {
        r.currentSlide && angular.isString(i) && !e.noTransition && o.$element ? (o.$element.addClass(i), o.$element[0].offsetWidth = o.$element[0].offsetWidth, angular.forEach(l, function (e) {
          angular.extend(e, {
            direction: '',
            entering: !1,
            leaving: !1,
            active: !1
          });
        }), angular.extend(o, {
          direction: i,
          active: !0,
          entering: !0
        }), angular.extend(r.currentSlide || {}, {
          direction: i,
          leaving: !0
        }), e.$currentTransition = n(o.$element, {}), function (t, n) {
          e.$currentTransition.then(function () {
            u(t, n);
          }, function () {
            u(t, n);
          });
        }(o, r.currentSlide)) : u(o, r.currentSlide), r.currentSlide = o, s = p, a();
      }
      function u(t, n) {
        angular.extend(t, {
          direction: '',
          active: !0,
          leaving: !1,
          entering: !1
        }), angular.extend(n || {}, {
          direction: '',
          active: !1,
          leaving: !1,
          entering: !1
        }), e.$currentTransition = null;
      }
      var p = l.indexOf(o);
      void 0 === i && (i = p > s ? 'next' : 'prev'), o && o !== r.currentSlide && (e.$currentTransition ? (e.$currentTransition.cancel(), t(c)) : c());
    }, r.indexOfSlide = function (e) {
      return l.indexOf(e);
    }, e.next = function () {
      var t = (s + 1) % l.length;
      return e.$currentTransition ? void 0 : r.select(l[t], 'next');
    }, e.prev = function () {
      var t = 0 > s - 1 ? l.length - 1 : s - 1;
      return e.$currentTransition ? void 0 : r.select(l[t], 'prev');
    }, e.select = function (e) {
      r.select(e);
    }, e.isActive = function (e) {
      return r.currentSlide === e;
    }, e.slides = function () {
      return l;
    }, e.$watch('interval', a), e.play = function () {
      i || (i = !0, a());
    }, e.pause = function () {
      e.noPause || (i = !1, o && t.cancel(o));
    }, r.addSlide = function (t, n) {
      t.$element = n, l.push(t), 1 === l.length || t.active ? (r.select(l[l.length - 1]), 1 == l.length && e.play()) : t.active = !1;
    }, r.removeSlide = function (e) {
      var t = l.indexOf(e);
      l.splice(t, 1), l.length > 0 && e.active ? t >= l.length ? r.select(l[t - 1]) : r.select(l[t]) : s > t && s--;
    };
  }
]).directive('carousel', [function () {
    return {
      restrict: 'EA',
      transclude: !0,
      replace: !0,
      controller: 'CarouselController',
      require: 'carousel',
      templateUrl: 'template/carousel/carousel.html',
      scope: {
        interval: '=',
        noTransition: '=',
        noPause: '='
      }
    };
  }]).directive('slide', [
  '$parse',
  function (e) {
    return {
      require: '^carousel',
      restrict: 'EA',
      transclude: !0,
      replace: !0,
      templateUrl: 'template/carousel/slide.html',
      scope: {},
      link: function (t, n, a, o) {
        if (a.active) {
          var i = e(a.active), r = i.assign, l = t.active = i(t.$parent);
          t.$watch(function () {
            var e = i(t.$parent);
            return e !== t.active && (e !== l ? l = t.active = e : r(t.$parent, e = l = t.active)), e;
          });
        }
        o.addSlide(t, n), t.$on('$destroy', function () {
          o.removeSlide(t);
        }), t.$watch('active', function (e) {
          e && o.select(t);
        });
      }
    };
  }
]), angular.module('ui.bootstrap.datepicker', []).constant('datepickerConfig', {
  dayFormat: 'dd',
  monthFormat: 'MMMM',
  yearFormat: 'yyyy',
  dayHeaderFormat: 'EEE',
  dayTitleFormat: 'MMMM yyyy',
  monthTitleFormat: 'yyyy',
  showWeeks: !0,
  startingDay: 0,
  yearRange: 20
}).directive('datepicker', [
  'dateFilter',
  '$parse',
  'datepickerConfig',
  function (e, t, n) {
    return {
      restrict: 'EA',
      replace: !0,
      scope: {
        model: '=ngModel',
        dateDisabled: '&'
      },
      templateUrl: 'template/datepicker/datepicker.html',
      link: function (a, o, r) {
        function l(e, t, n) {
          a.rows = e, a.labels = t, a.title = n;
        }
        function s() {
          a.showWeekNumbers = 'day' === a.mode && p;
        }
        function c(e, t) {
          return 'year' === a.mode ? t.getFullYear() - e.getFullYear() : 'month' === a.mode ? new Date(t.getFullYear(), t.getMonth()) - new Date(e.getFullYear(), e.getMonth()) : 'day' === a.mode ? new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(e.getFullYear(), e.getMonth(), e.getDate()) : void 0;
        }
        function u(e) {
          return d && c(e, d) > 0 || m && 0 > c(e, m) || a.dateDisabled && a.dateDisabled({
            date: e,
            mode: a.mode
          });
        }
        a.mode = 'day';
        var p, d, m, g = new Date(), f = {};
        f.day = angular.isDefined(r.dayFormat) ? a.$eval(r.dayFormat) : n.dayFormat, f.month = angular.isDefined(r.monthFormat) ? a.$eval(r.monthFormat) : n.monthFormat, f.year = angular.isDefined(r.yearFormat) ? a.$eval(r.yearFormat) : n.yearFormat, f.dayHeader = angular.isDefined(r.dayHeaderFormat) ? a.$eval(r.dayHeaderFormat) : n.dayHeaderFormat, f.dayTitle = angular.isDefined(r.dayTitleFormat) ? a.$eval(r.dayTitleFormat) : n.dayTitleFormat, f.monthTitle = angular.isDefined(r.monthTitleFormat) ? a.$eval(r.monthTitleFormat) : n.monthTitleFormat;
        var h = angular.isDefined(r.startingDay) ? a.$eval(r.startingDay) : n.startingDay, v = angular.isDefined(r.yearRange) ? a.$eval(r.yearRange) : n.yearRange;
        r.showWeeks ? a.$parent.$watch(t(r.showWeeks), function (e) {
          p = !!e, s();
        }) : (p = n.showWeeks, s()), r.min && a.$parent.$watch(t(r.min), function (e) {
          d = new Date(e), w();
        }), r.max && a.$parent.$watch(t(r.max), function (e) {
          m = new Date(e), w();
        });
        var b = function (e, t) {
            for (var n = []; e.length > 0;)
              n.push(e.splice(0, t));
            return n;
          }, $ = function (e, t) {
            return new Date(e, t + 1, 0).getDate();
          }, y = {
            day: function () {
              function t(t, a, i) {
                for (var r = 0; a > r; r++)
                  n.push({
                    date: new Date(t),
                    isCurrent: i,
                    isSelected: k(t),
                    label: e(t, f.day),
                    disabled: u(t)
                  }), t.setDate(t.getDate() + 1);
                o = t;
              }
              var n = [], a = [], o = null, r = new Date(g);
              r.setDate(1);
              var s = h - r.getDay(), c = s > 0 ? 7 - s : -s;
              for (c > 0 && (r.setDate(-c + 1), t(r, c, !1)), t(o || r, $(g.getFullYear(), g.getMonth()), !0), t(o, (7 - n.length % 7) % 7, !1), i = 0; 7 > i; i++)
                a.push(e(n[i].date, f.dayHeader));
              l(b(n, 7), a, e(g, f.dayTitle));
            },
            month: function () {
              for (var t = [], n = 0, a = g.getFullYear(); 12 > n;) {
                var o = new Date(a, n++, 1);
                t.push({
                  date: o,
                  isCurrent: !0,
                  isSelected: k(o),
                  label: e(o, f.month),
                  disabled: u(o)
                });
              }
              l(b(t, 3), [], e(g, f.monthTitle));
            },
            year: function () {
              for (var t = [], n = parseInt((g.getFullYear() - 1) / v, 10) * v + 1, a = 0; v > a; a++) {
                var o = new Date(n + a, 0, 1);
                t.push({
                  date: o,
                  isCurrent: !0,
                  isSelected: k(o),
                  label: e(o, f.year),
                  disabled: u(o)
                });
              }
              var i = t[0].label + ' - ' + t[t.length - 1].label;
              l(b(t, 5), [], i);
            }
          }, w = function () {
            y[a.mode]();
          }, k = function (e) {
            if (a.model && a.model.getFullYear() === e.getFullYear()) {
              if ('year' === a.mode)
                return !0;
              if (a.model.getMonth() === e.getMonth())
                return 'month' === a.mode || 'day' === a.mode && a.model.getDate() === e.getDate();
            }
            return !1;
          };
        a.$watch('model', function (e, t) {
          angular.isDate(e) && (g = angular.copy(e)), angular.equals(e, t) || w();
        }), a.$watch('mode', function () {
          s(), w();
        }), a.select = function (e) {
          g = new Date(e), 'year' === a.mode ? (a.mode = 'month', g.setFullYear(e.getFullYear())) : 'month' === a.mode ? (a.mode = 'day', g.setMonth(e.getMonth())) : 'day' === a.mode && (a.model = new Date(g));
        }, a.move = function (e) {
          'day' === a.mode ? g.setMonth(g.getMonth() + e) : 'month' === a.mode ? g.setFullYear(g.getFullYear() + e) : 'year' === a.mode && g.setFullYear(g.getFullYear() + e * v), w();
        }, a.toggleMode = function () {
          a.mode = 'day' === a.mode ? 'month' : 'month' === a.mode ? 'year' : 'day';
        }, a.getWeekNumber = function (e) {
          if ('day' === a.mode && a.showWeekNumbers && 7 === e.length) {
            var t = h > 4 ? 11 - h : 4 - h, n = new Date(e[t].date);
            return n.setHours(0, 0, 0), Math.ceil(((n - new Date(n.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
          }
        };
      }
    };
  }
]);
var dialogModule = angular.module('ui.bootstrap.dialog', ['ui.bootstrap.transition']);
dialogModule.controller('MessageBoxController', [
  '$scope',
  'dialog',
  'model',
  function (e, t, n) {
    e.title = n.title, e.message = n.message, e.buttons = n.buttons, e.close = function (e) {
      t.close(e);
    };
  }
]), dialogModule.provider('$dialog', function () {
  var e = {
      backdrop: !0,
      dialogClass: 'modal',
      backdropClass: 'modal-backdrop',
      transitionClass: 'fade',
      triggerClass: 'in',
      resolve: {},
      backdropFade: !1,
      dialogFade: !1,
      keyboard: !0,
      backdropClick: !0
    }, t = {}, n = { value: 0 };
  this.options = function (e) {
    t = e;
  }, this.$get = [
    '$http',
    '$document',
    '$compile',
    '$rootScope',
    '$controller',
    '$templateCache',
    '$q',
    '$transition',
    '$injector',
    function (a, o, i, r, l, s, c, u, p) {
      function d(e) {
        var t = angular.element('<div>');
        return t.addClass(e), t;
      }
      function m(n) {
        var a = this, o = this.options = angular.extend({}, e, t, n);
        this._open = !1, this.backdropEl = d(o.backdropClass), o.backdropFade && (this.backdropEl.addClass(o.transitionClass), this.backdropEl.removeClass(o.triggerClass)), this.modalEl = d(o.dialogClass), o.dialogFade && (this.modalEl.addClass(o.transitionClass), this.modalEl.removeClass(o.triggerClass)), this.handledEscapeKey = function (e) {
          27 === e.which && (a.close(), e.preventDefault(), a.$scope.$apply());
        }, this.handleBackDropClick = function (e) {
          a.close(), e.preventDefault(), a.$scope.$apply();
        }, this.handleLocationChange = function () {
          a.close();
        };
      }
      var g = o.find('body');
      return m.prototype.isOpen = function () {
        return this._open;
      }, m.prototype.open = function (e, t) {
        var n = this, a = this.options;
        if (e && (a.templateUrl = e), t && (a.controller = t), !a.template && !a.templateUrl)
          throw Error('Dialog.open expected template or templateUrl, neither found. Use options or open method to specify them.');
        return this._loadResolves().then(function (e) {
          var t = e.$scope = n.$scope = e.$scope ? e.$scope : r.$new();
          if (n.modalEl.html(e.$template), n.options.controller) {
            var a = l(n.options.controller, e);
            n.modalEl.children().data('ngControllerController', a);
          }
          i(n.modalEl)(t), n._addElementsToDom(), setTimeout(function () {
            n.options.dialogFade && n.modalEl.addClass(n.options.triggerClass), n.options.backdropFade && n.backdropEl.addClass(n.options.triggerClass);
          }), n._bindEvents();
        }), this.deferred = c.defer(), this.deferred.promise;
      }, m.prototype.close = function (e) {
        function t(e) {
          e.removeClass(a.options.triggerClass);
        }
        function n() {
          a._open && a._onCloseComplete(e);
        }
        var a = this, o = this._getFadingElements();
        if (o.length > 0)
          for (var i = o.length - 1; i >= 0; i--)
            u(o[i], t).then(n);
        else
          this._onCloseComplete(e);
      }, m.prototype._getFadingElements = function () {
        var e = [];
        return this.options.dialogFade && e.push(this.modalEl), this.options.backdropFade && e.push(this.backdropEl), e;
      }, m.prototype._bindEvents = function () {
        this.options.keyboard && g.bind('keydown', this.handledEscapeKey), this.options.backdrop && this.options.backdropClick && this.backdropEl.bind('click', this.handleBackDropClick);
      }, m.prototype._unbindEvents = function () {
        this.options.keyboard && g.unbind('keydown', this.handledEscapeKey), this.options.backdrop && this.options.backdropClick && this.backdropEl.unbind('click', this.handleBackDropClick);
      }, m.prototype._onCloseComplete = function (e) {
        this._removeElementsFromDom(), this._unbindEvents(), this.deferred.resolve(e);
      }, m.prototype._addElementsToDom = function () {
        g.append(this.modalEl), this.options.backdrop && (0 === n.value && g.append(this.backdropEl), n.value++), this._open = !0;
      }, m.prototype._removeElementsFromDom = function () {
        this.modalEl.remove(), this.options.backdrop && (n.value--, 0 === n.value && this.backdropEl.remove()), this._open = !1;
      }, m.prototype._loadResolves = function () {
        var e, t = [], n = [], o = this;
        return this.options.template ? e = c.when(this.options.template) : this.options.templateUrl && (e = a.get(this.options.templateUrl, { cache: s }).then(function (e) {
          return e.data;
        })), angular.forEach(this.options.resolve || [], function (e, a) {
          n.push(a), t.push(angular.isString(e) ? p.get(e) : p.invoke(e));
        }), n.push('$template'), t.push(e), c.all(t).then(function (e) {
          var t = {};
          return angular.forEach(e, function (e, a) {
            t[n[a]] = e;
          }), t.dialog = o, t;
        });
      }, {
        dialog: function (e) {
          return new m(e);
        },
        messageBox: function (e, t, n) {
          return new m({
            templateUrl: 'template/dialog/message.html',
            controller: 'MessageBoxController',
            resolve: {
              model: function () {
                return {
                  title: e,
                  message: t,
                  buttons: n
                };
              }
            }
          });
        }
      };
    }
  ];
}), angular.module('ui.bootstrap.dropdownToggle', []).directive('dropdownToggle', [
  '$document',
  '$location',
  function (e) {
    var t = null, n = angular.noop;
    return {
      restrict: 'CA',
      link: function (a, o) {
        a.$watch('$location.path', function () {
          n();
        }), o.parent().bind('click', function () {
          n();
        }), o.bind('click', function (a) {
          var i = o === t;
          a.preventDefault(), a.stopPropagation(), t && n(), i || (o.parent().addClass('open'), t = o, n = function (a) {
            a && (a.preventDefault(), a.stopPropagation()), e.unbind('click', n), o.parent().removeClass('open'), n = angular.noop, t = null;
          }, e.bind('click', n));
        });
      }
    };
  }
]), angular.module('ui.bootstrap.modal', ['ui.bootstrap.dialog']).directive('modal', [
  '$parse',
  '$dialog',
  function (e, t) {
    return {
      restrict: 'EA',
      terminal: !0,
      link: function (n, a, o) {
        var i, r = angular.extend({}, n.$eval(o.uiOptions || o.bsOptions || o.options)), l = o.modal || o.show;
        r = angular.extend(r, {
          template: a.html(),
          resolve: {
            $scope: function () {
              return n;
            }
          }
        });
        var s = t.dialog(r);
        a.remove(), i = o.close ? function () {
          e(o.close)(n);
        } : function () {
          angular.isFunction(e(l).assign) && e(l).assign(n, !1);
        }, n.$watch(l, function (e) {
          e ? s.open().then(function () {
            i();
          }) : s.isOpen() && s.close();
        });
      }
    };
  }
]), angular.module('ui.bootstrap.pagination', []).controller('PaginationController', [
  '$scope',
  function (e) {
    e.noPrevious = function () {
      return 1 === e.currentPage;
    }, e.noNext = function () {
      return e.currentPage === e.numPages;
    }, e.isActive = function (t) {
      return e.currentPage === t;
    }, e.selectPage = function (t) {
      !e.isActive(t) && t > 0 && e.numPages >= t && (e.currentPage = t, e.onSelectPage({ page: t }));
    };
  }
]).constant('paginationConfig', {
  boundaryLinks: !1,
  directionLinks: !0,
  firstText: 'First',
  previousText: 'Previous',
  nextText: 'Next',
  lastText: 'Last',
  rotate: !0
}).directive('pagination', [
  'paginationConfig',
  function (e) {
    return {
      restrict: 'EA',
      scope: {
        numPages: '=',
        currentPage: '=',
        maxSize: '=',
        onSelectPage: '&'
      },
      controller: 'PaginationController',
      templateUrl: 'template/pagination/pagination.html',
      replace: !0,
      link: function (t, n, a) {
        function o(e, t, n, a) {
          return {
            number: e,
            text: t,
            active: n,
            disabled: a
          };
        }
        var i = angular.isDefined(a.boundaryLinks) ? t.$eval(a.boundaryLinks) : e.boundaryLinks, r = angular.isDefined(a.directionLinks) ? t.$eval(a.directionLinks) : e.directionLinks, l = angular.isDefined(a.firstText) ? t.$parent.$eval(a.firstText) : e.firstText, s = angular.isDefined(a.previousText) ? t.$parent.$eval(a.previousText) : e.previousText, c = angular.isDefined(a.nextText) ? t.$parent.$eval(a.nextText) : e.nextText, u = angular.isDefined(a.lastText) ? t.$parent.$eval(a.lastText) : e.lastText, p = angular.isDefined(a.rotate) ? t.$eval(a.rotate) : e.rotate;
        t.$watch('numPages + currentPage + maxSize', function () {
          t.pages = [];
          var e = 1, n = t.numPages, a = angular.isDefined(t.maxSize) && t.maxSize < t.numPages;
          a && (p ? (e = Math.max(t.currentPage - Math.floor(t.maxSize / 2), 1), n = e + t.maxSize - 1, n > t.numPages && (n = t.numPages, e = n - t.maxSize + 1)) : (e = (Math.ceil(t.currentPage / t.maxSize) - 1) * t.maxSize + 1, n = Math.min(e + t.maxSize - 1, t.numPages)));
          for (var d = e; n >= d; d++) {
            var m = o(d, d, t.isActive(d), !1);
            t.pages.push(m);
          }
          if (a && !p) {
            if (e > 1) {
              var g = o(e - 1, '...', !1, !1);
              t.pages.unshift(g);
            }
            if (t.numPages > n) {
              var f = o(n + 1, '...', !1, !1);
              t.pages.push(f);
            }
          }
          if (r) {
            var h = o(t.currentPage - 1, s, !1, t.noPrevious());
            t.pages.unshift(h);
            var v = o(t.currentPage + 1, c, !1, t.noNext());
            t.pages.push(v);
          }
          if (i) {
            var b = o(1, l, !1, t.noPrevious());
            t.pages.unshift(b);
            var $ = o(t.numPages, u, !1, t.noNext());
            t.pages.push($);
          }
          t.currentPage > t.numPages && t.selectPage(t.numPages);
        });
      }
    };
  }
]).constant('pagerConfig', {
  previousText: '\xab Previous',
  nextText: 'Next \xbb',
  align: !0
}).directive('pager', [
  'pagerConfig',
  function (e) {
    return {
      restrict: 'EA',
      scope: {
        numPages: '=',
        currentPage: '=',
        onSelectPage: '&'
      },
      controller: 'PaginationController',
      templateUrl: 'template/pagination/pager.html',
      replace: !0,
      link: function (t, n, a) {
        function o(e, t, n, a, o) {
          return {
            number: e,
            text: t,
            disabled: n,
            previous: l && a,
            next: l && o
          };
        }
        var i = angular.isDefined(a.previousText) ? t.$parent.$eval(a.previousText) : e.previousText, r = angular.isDefined(a.nextText) ? t.$parent.$eval(a.nextText) : e.nextText, l = angular.isDefined(a.align) ? t.$parent.$eval(a.align) : e.align;
        t.$watch('numPages + currentPage', function () {
          t.pages = [];
          var e = o(t.currentPage - 1, i, t.noPrevious(), !0, !1);
          t.pages.unshift(e);
          var n = o(t.currentPage + 1, r, t.noNext(), !1, !0);
          t.pages.push(n), t.currentPage > t.numPages && t.selectPage(t.numPages);
        });
      }
    };
  }
]), angular.module('ui.bootstrap.position', []).factory('$position', [
  '$document',
  '$window',
  function (e, t) {
    function n(e, n) {
      return e.currentStyle ? e.currentStyle[n] : t.getComputedStyle ? t.getComputedStyle(e)[n] : e.style[n];
    }
    function a(e) {
      return 'static' === (n(e, 'position') || 'static');
    }
    var o, i;
    e.bind('mousemove', function (e) {
      o = e.pageX, i = e.pageY;
    });
    var r = function (t) {
      for (var n = e[0], o = t.offsetParent || n; o && o !== n && a(o);)
        o = o.offsetParent;
      return o || n;
    };
    return {
      position: function (t) {
        var n = this.offset(t), a = {
            top: 0,
            left: 0
          }, o = r(t[0]);
        return o != e[0] && (a = this.offset(angular.element(o)), a.top += o.clientTop, a.left += o.clientLeft), {
          width: t.prop('offsetWidth'),
          height: t.prop('offsetHeight'),
          top: n.top - a.top,
          left: n.left - a.left
        };
      },
      offset: function (n) {
        var a = n[0].getBoundingClientRect();
        return {
          width: n.prop('offsetWidth'),
          height: n.prop('offsetHeight'),
          top: a.top + (t.pageYOffset || e[0].body.scrollTop),
          left: a.left + (t.pageXOffset || e[0].body.scrollLeft)
        };
      },
      mouse: function () {
        return {
          x: o,
          y: i
        };
      }
    };
  }
]), angular.module('ui.bootstrap.tooltip', ['ui.bootstrap.position']).provider('$tooltip', function () {
  function e(e) {
    var t = /[A-Z]/g, n = '-';
    return e.replace(t, function (e, t) {
      return (t ? n : '') + e.toLowerCase();
    });
  }
  var t = {
      placement: 'top',
      animation: !0,
      popupDelay: 0
    }, n = {
      mouseenter: 'mouseleave',
      click: 'click',
      focus: 'blur'
    }, a = {};
  this.options = function (e) {
    angular.extend(a, e);
  }, this.setTriggers = function (e) {
    angular.extend(n, e);
  }, this.$get = [
    '$window',
    '$compile',
    '$timeout',
    '$parse',
    '$document',
    '$position',
    '$interpolate',
    function (o, i, r, l, s, c, u) {
      return function (o, p, d) {
        function m(e) {
          var t, a;
          return t = e || g.trigger || d, a = angular.isDefined(g.trigger) ? n[g.trigger] || t : n[t] || t, {
            show: t,
            hide: a
          };
        }
        var g = angular.extend({}, t, a), f = e(o), h = m(void 0), v = u.startSymbol(), b = u.endSymbol(), $ = '<' + f + '-popup ' + 'title="' + v + 'tt_title' + b + '" ' + 'content="' + v + 'tt_content' + b + '" ' + 'placement="' + v + 'tt_placement' + b + '" ' + 'animation="tt_animation()" ' + 'is-open="tt_isOpen"' + '>' + '</' + f + '-popup>';
        return {
          restrict: 'EA',
          scope: !0,
          link: function (e, t, n) {
            function a() {
              e.tt_isOpen ? d() : u();
            }
            function u() {
              e.tt_popupDelay ? y = r(f, e.tt_popupDelay) : e.$apply(f);
            }
            function d() {
              e.$apply(function () {
                v();
              });
            }
            function f() {
              var n, a, o, i;
              if (e.tt_content) {
                switch (b && r.cancel(b), k.css({
                    top: 0,
                    left: 0,
                    display: 'block'
                  }), x ? (w = w || s.find('body'), w.append(k)) : t.after(k), n = g.appendToBody ? c.offset(t) : c.position(t), a = k.prop('offsetWidth'), o = k.prop('offsetHeight'), e.tt_placement) {
                case 'mouse':
                  var l = c.mouse();
                  i = {
                    top: l.y,
                    left: l.x
                  };
                  break;
                case 'right':
                  i = {
                    top: n.top + n.height / 2 - o / 2,
                    left: n.left + n.width
                  };
                  break;
                case 'bottom':
                  i = {
                    top: n.top + n.height,
                    left: n.left + n.width / 2 - a / 2
                  };
                  break;
                case 'left':
                  i = {
                    top: n.top + n.height / 2 - o / 2,
                    left: n.left - a
                  };
                  break;
                default:
                  i = {
                    top: n.top - o,
                    left: n.left + n.width / 2 - a / 2
                  };
                }
                i.top += 'px', i.left += 'px', k.css(i), e.tt_isOpen = !0;
              }
            }
            function v() {
              e.tt_isOpen = !1, r.cancel(y), angular.isDefined(e.tt_animation) && e.tt_animation() ? b = r(function () {
                k.remove();
              }, 500) : k.remove();
            }
            var b, y, w, k = i($)(e), x = angular.isDefined(g.appendToBody) ? g.appendToBody : !1;
            e.tt_isOpen = !1, n.$observe(o, function (t) {
              e.tt_content = t;
            }), n.$observe(p + 'Title', function (t) {
              e.tt_title = t;
            }), n.$observe(p + 'Placement', function (t) {
              e.tt_placement = angular.isDefined(t) ? t : g.placement;
            }), n.$observe(p + 'Animation', function (t) {
              e.tt_animation = angular.isDefined(t) ? l(t) : function () {
                return g.animation;
              };
            }), n.$observe(p + 'PopupDelay', function (t) {
              var n = parseInt(t, 10);
              e.tt_popupDelay = isNaN(n) ? g.popupDelay : n;
            }), n.$observe(p + 'Trigger', function (e) {
              t.unbind(h.show), t.unbind(h.hide), h = m(e), h.show === h.hide ? t.bind(h.show, a) : (t.bind(h.show, u), t.bind(h.hide, d));
            }), n.$observe(p + 'AppendToBody', function (t) {
              x = angular.isDefined(t) ? l(t)(e) : x;
            }), x && e.$on('$locationChangeSuccess', function () {
              e.tt_isOpen && v();
            }), e.$on('$destroy', function () {
              e.tt_isOpen ? v() : k.remove();
            });
          }
        };
      };
    }
  ];
}).directive('tooltipPopup', function () {
  return {
    restrict: 'E',
    replace: !0,
    scope: {
      content: '@',
      placement: '@',
      animation: '&',
      isOpen: '&'
    },
    templateUrl: 'template/tooltip/tooltip-popup.html'
  };
}).directive('tooltip', [
  '$tooltip',
  function (e) {
    return e('tooltip', 'tooltip', 'mouseenter');
  }
]).directive('tooltipHtmlUnsafePopup', function () {
  return {
    restrict: 'E',
    replace: !0,
    scope: {
      content: '@',
      placement: '@',
      animation: '&',
      isOpen: '&'
    },
    templateUrl: 'template/tooltip/tooltip-html-unsafe-popup.html'
  };
}).directive('tooltipHtmlUnsafe', [
  '$tooltip',
  function (e) {
    return e('tooltipHtmlUnsafe', 'tooltip', 'mouseenter');
  }
]), angular.module('ui.bootstrap.popover', ['ui.bootstrap.tooltip']).directive('popoverPopup', function () {
  return {
    restrict: 'EA',
    replace: !0,
    scope: {
      title: '@',
      content: '@',
      placement: '@',
      animation: '&',
      isOpen: '&'
    },
    templateUrl: 'template/popover/popover.html'
  };
}).directive('popover', [
  '$compile',
  '$timeout',
  '$parse',
  '$window',
  '$tooltip',
  function (e, t, n, a, o) {
    return o('popover', 'popover', 'click');
  }
]), angular.module('ui.bootstrap.progressbar', ['ui.bootstrap.transition']).constant('progressConfig', {
  animate: !0,
  autoType: !1,
  stackedTypes: [
    'success',
    'info',
    'warning',
    'danger'
  ]
}).controller('ProgressBarController', [
  '$scope',
  '$attrs',
  'progressConfig',
  function (e, t, n) {
    function a(e) {
      return r[e];
    }
    var o = angular.isDefined(t.animate) ? e.$eval(t.animate) : n.animate, i = angular.isDefined(t.autoType) ? e.$eval(t.autoType) : n.autoType, r = angular.isDefined(t.stackedTypes) ? e.$eval('[' + t.stackedTypes + ']') : n.stackedTypes;
    this.makeBar = function (e, t, n) {
      var r = angular.isObject(e) ? e.value : e || 0, l = angular.isObject(t) ? t.value : t || 0, s = angular.isObject(e) && angular.isDefined(e.type) ? e.type : i ? a(n || 0) : null;
      return {
        from: l,
        to: r,
        type: s,
        animate: o
      };
    }, this.addBar = function (t) {
      e.bars.push(t), e.totalPercent += t.to;
    }, this.clearBars = function () {
      e.bars = [], e.totalPercent = 0;
    }, this.clearBars();
  }
]).directive('progress', function () {
  return {
    restrict: 'EA',
    replace: !0,
    controller: 'ProgressBarController',
    scope: {
      value: '=percent',
      onFull: '&',
      onEmpty: '&'
    },
    templateUrl: 'template/progressbar/progress.html',
    link: function (e, t, n, a) {
      e.$watch('value', function (e, t) {
        if (a.clearBars(), angular.isArray(e))
          for (var n = 0, o = e.length; o > n; n++)
            a.addBar(a.makeBar(e[n], t[n], n));
        else
          a.addBar(a.makeBar(e, t));
      }, !0), e.$watch('totalPercent', function (t) {
        t >= 100 ? e.onFull() : 0 >= t && e.onEmpty();
      }, !0);
    }
  };
}).directive('progressbar', [
  '$transition',
  function (e) {
    return {
      restrict: 'EA',
      replace: !0,
      scope: {
        width: '=',
        old: '=',
        type: '=',
        animate: '='
      },
      templateUrl: 'template/progressbar/bar.html',
      link: function (t, n) {
        t.$watch('width', function (a) {
          t.animate ? (n.css('width', t.old + '%'), e(n, { width: a + '%' })) : n.css('width', a + '%');
        });
      }
    };
  }
]), angular.module('ui.bootstrap.rating', []).constant('ratingConfig', { max: 5 }).directive('rating', [
  'ratingConfig',
  '$parse',
  function (e, t) {
    return {
      restrict: 'EA',
      scope: { value: '=' },
      templateUrl: 'template/rating/rating.html',
      replace: !0,
      link: function (n, a, o) {
        var i = angular.isDefined(o.max) ? n.$eval(o.max) : e.max;
        n.range = [];
        for (var r = 1; i >= r; r++)
          n.range.push(r);
        n.rate = function (e) {
          n.readonly || (n.value = e);
        }, n.enter = function (e) {
          n.readonly || (n.val = e);
        }, n.reset = function () {
          n.val = angular.copy(n.value);
        }, n.reset(), n.$watch('value', function (e) {
          n.val = e;
        }), n.readonly = !1, o.readonly && n.$parent.$watch(t(o.readonly), function (e) {
          n.readonly = !!e;
        });
      }
    };
  }
]), angular.module('ui.bootstrap.tabs', []).directive('tabs', function () {
  return function () {
    throw Error('The `tabs` directive is deprecated, please migrate to `tabset`. Instructions can be found at http://github.com/angular-ui/bootstrap/tree/master/CHANGELOG.md');
  };
}).controller('TabsetController', [
  '$scope',
  '$element',
  function (e) {
    var t = this, n = t.tabs = e.tabs = [];
    t.select = function (e) {
      angular.forEach(n, function (e) {
        e.active = !1;
      }), e.active = !0;
    }, t.addTab = function (e) {
      n.push(e), 1 == n.length && t.select(e);
    }, t.removeTab = function (e) {
      var a = n.indexOf(e);
      if (e.active && n.length > 1) {
        var o = a == n.length - 1 ? a - 1 : a + 1;
        t.select(n[o]);
      }
      n.splice(a, 1);
    };
  }
]).directive('tabset', function () {
  return {
    restrict: 'EA',
    transclude: !0,
    scope: {},
    controller: 'TabsetController',
    templateUrl: 'template/tabs/tabset.html',
    link: function (e, t, n) {
      e.vertical = angular.isDefined(n.vertical) ? e.$eval(n.vertical) : !1, e.type = angular.isDefined(n.type) ? e.$parent.$eval(n.type) : 'tabs';
    }
  };
}).directive('tab', [
  '$parse',
  '$http',
  '$templateCache',
  '$compile',
  function (e) {
    return {
      require: '^tabset',
      restrict: 'EA',
      replace: !0,
      templateUrl: 'template/tabs/tab.html',
      transclude: !0,
      scope: {
        heading: '@',
        onSelect: '&select'
      },
      controller: function () {
      },
      compile: function (t, n, a) {
        return function (t, n, o, i) {
          var r, l;
          t.active = !1, o.active ? (r = e(o.active), l = r.assign, t.$parent.$watch(r, function (e) {
            e && t.disabled ? l(t.$parent, !1) : t.active = !!e;
          })) : l = r = angular.noop, t.$watch('active', function (e) {
            l(t.$parent, e), e && (i.select(t), t.onSelect());
          }), t.disabled = !1, o.disabled && t.$parent.$watch(e(o.disabled), function (e) {
            t.disabled = !!e;
          }), t.select = function () {
            t.disabled || (t.active = !0);
          }, i.addTab(t), t.$on('$destroy', function () {
            i.removeTab(t);
          }), t.active && l(t.$parent, !0), a(t.$parent, function (e) {
            var n, a = [];
            angular.forEach(e, function (e) {
              e.tagName && (e.hasAttribute('tab-heading') || e.hasAttribute('data-tab-heading') || 'tab-heading' == e.tagName.toLowerCase() || 'data-tab-heading' == e.tagName.toLowerCase()) ? n = e : a.push(e);
            }), n && (t.headingElement = angular.element(n)), t.contentElement = angular.element(a);
          });
        };
      }
    };
  }
]).directive('tabHeadingTransclude', [function () {
    return {
      restrict: 'A',
      require: '^tab',
      link: function (e, t) {
        e.$watch('headingElement', function (e) {
          e && (t.html(''), t.append(e));
        });
      }
    };
  }]).directive('tabContentTransclude', [
  '$parse',
  function (e) {
    return {
      restrict: 'A',
      require: '^tabset',
      link: function (t, n, a) {
        t.$watch(e(a.tabContentTransclude), function (e) {
          n.html(''), e && n.append(e.contentElement);
        });
      }
    };
  }
]), angular.module('ui.bootstrap.timepicker', []).filter('pad', function () {
  return function (e) {
    return angular.isDefined(e) && 2 > ('' + e).length && (e = '0' + e), e;
  };
}).constant('timepickerConfig', {
  hourStep: 1,
  minuteStep: 1,
  showMeridian: !0,
  meridians: [
    'AM',
    'PM'
  ],
  readonlyInput: !1,
  mousewheel: !0
}).directive('timepicker', [
  'padFilter',
  '$parse',
  'timepickerConfig',
  function (e, t, n) {
    return {
      restrict: 'EA',
      require: 'ngModel',
      replace: !0,
      templateUrl: 'template/timepicker/timepicker.html',
      scope: { model: '=ngModel' },
      link: function (a, o, i) {
        function r() {
          var e = parseInt(a.hours, 10), t = a.showMeridian ? e > 0 && 13 > e : e >= 0 && 24 > e;
          return t ? (a.showMeridian && (12 === e && (e = 0), a.meridian === u[1] && (e += 12)), e) : void 0;
        }
        function l() {
          var t = c.getHours();
          a.showMeridian && (t = 0 === t || 12 === t ? 12 : t % 12), a.hours = 'h' === b ? t : e(t), a.validHours = !0;
          var n = c.getMinutes();
          a.minutes = 'm' === b ? n : e(n), a.validMinutes = !0, a.meridian = a.showMeridian ? 12 > c.getHours() ? u[0] : u[1] : '', b = !1;
        }
        function s(e) {
          var t = new Date(c.getTime() + 60000 * e);
          t.getDate() !== c.getDate() && t.setDate(t.getDate() - 1), c.setTime(t.getTime()), a.model = new Date(c);
        }
        var c = new Date(), u = n.meridians, p = n.hourStep;
        i.hourStep && a.$parent.$watch(t(i.hourStep), function (e) {
          p = parseInt(e, 10);
        });
        var d = n.minuteStep;
        i.minuteStep && a.$parent.$watch(t(i.minuteStep), function (e) {
          d = parseInt(e, 10);
        }), a.showMeridian = n.showMeridian, i.showMeridian && a.$parent.$watch(t(i.showMeridian), function (e) {
          if (a.showMeridian = !!e, a.model)
            l();
          else {
            var t = new Date(c), n = r();
            angular.isDefined(n) && t.setHours(n), a.model = new Date(t);
          }
        });
        var m = o.find('input'), g = m.eq(0), f = m.eq(1), h = angular.isDefined(i.mousewheel) ? a.$eval(i.mousewheel) : n.mousewheel;
        if (h) {
          var v = function (e) {
            return e.originalEvent && (e = e.originalEvent), e.detail || e.wheelDelta > 0;
          };
          g.bind('mousewheel', function (e) {
            a.$apply(v(e) ? a.incrementHours() : a.decrementHours()), e.preventDefault();
          }), f.bind('mousewheel', function (e) {
            a.$apply(v(e) ? a.incrementMinutes() : a.decrementMinutes()), e.preventDefault();
          });
        }
        var b = !1;
        a.readonlyInput = angular.isDefined(i.readonlyInput) ? a.$eval(i.readonlyInput) : n.readonlyInput, a.readonlyInput ? (a.updateHours = angular.noop, a.updateMinutes = angular.noop) : (a.updateHours = function () {
          var e = r();
          angular.isDefined(e) ? (b = 'h', null === a.model && (a.model = new Date(c)), a.model.setHours(e)) : (a.model = null, a.validHours = !1);
        }, g.bind('blur', function () {
          a.validHours && 10 > a.hours && a.$apply(function () {
            a.hours = e(a.hours);
          });
        }), a.updateMinutes = function () {
          var e = parseInt(a.minutes, 10);
          e >= 0 && 60 > e ? (b = 'm', null === a.model && (a.model = new Date(c)), a.model.setMinutes(e)) : (a.model = null, a.validMinutes = !1);
        }, f.bind('blur', function () {
          a.validMinutes && 10 > a.minutes && a.$apply(function () {
            a.minutes = e(a.minutes);
          });
        })), a.$watch(function () {
          return +a.model;
        }, function (e) {
          !isNaN(e) && e > 0 && (c = new Date(e), l());
        }), a.incrementHours = function () {
          s(60 * p);
        }, a.decrementHours = function () {
          s(60 * -p);
        }, a.incrementMinutes = function () {
          s(d);
        }, a.decrementMinutes = function () {
          s(-d);
        }, a.toggleMeridian = function () {
          s(720 * (12 > c.getHours() ? 1 : -1));
        };
      }
    };
  }
]), angular.module('ui.bootstrap.typeahead', ['ui.bootstrap.position']).factory('typeaheadParser', [
  '$parse',
  function (e) {
    var t = /^\s*(.*?)(?:\s+as\s+(.*?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+(.*)$/;
    return {
      parse: function (n) {
        var a = n.match(t);
        if (!a)
          throw Error('Expected typeahead specification in form of \'_modelValue_ (as _label_)? for _item_ in _collection_\' but got \'' + n + '\'.');
        return {
          itemName: a[3],
          source: e(a[4]),
          viewMapper: e(a[2] || a[1]),
          modelMapper: e(a[1])
        };
      }
    };
  }
]).directive('typeahead', [
  '$compile',
  '$parse',
  '$q',
  '$timeout',
  '$document',
  '$position',
  'typeaheadParser',
  function (e, t, n, a, o, i, r) {
    var l = [
        9,
        13,
        27,
        38,
        40
      ];
    return {
      require: 'ngModel',
      link: function (s, c, u, p) {
        var d, m = s.$eval(u.typeaheadMinLength) || 1, g = s.$eval(u.typeaheadWaitMs) || 0, f = r.parse(u.typeahead), h = s.$eval(u.typeaheadEditable) !== !1, v = t(u.typeaheadLoading).assign || angular.noop, b = t(u.typeaheadOnSelect), $ = angular.element('<typeahead-popup></typeahead-popup>');
        $.attr({
          matches: 'matches',
          active: 'activeIdx',
          select: 'select(activeIdx)',
          query: 'query',
          position: 'position'
        });
        var y = s.$new();
        s.$on('$destroy', function () {
          y.$destroy();
        });
        var w = function () {
            y.matches = [], y.activeIdx = -1;
          }, k = function (e) {
            var t = { $viewValue: e };
            v(s, !0), n.when(f.source(y, t)).then(function (n) {
              if (e === p.$viewValue) {
                if (n.length > 0) {
                  y.activeIdx = 0, y.matches.length = 0;
                  for (var a = 0; n.length > a; a++)
                    t[f.itemName] = n[a], y.matches.push({
                      label: f.viewMapper(y, t),
                      model: n[a]
                    });
                  y.query = e, y.position = i.position(c), y.position.top = y.position.top + c.prop('offsetHeight');
                } else
                  w();
                v(s, !1);
              }
            }, function () {
              w(), v(s, !1);
            });
          };
        w(), y.query = void 0, p.$parsers.push(function (e) {
          var t;
          return w(), d ? e : (e && e.length >= m && (g > 0 ? (t && a.cancel(t), t = a(function () {
            k(e);
          }, g)) : k(e)), h ? e : void 0);
        }), p.$render = function () {
          var e = {};
          e[f.itemName] = d || p.$viewValue, c.val(f.viewMapper(y, e) || p.$viewValue), d = void 0;
        }, y.select = function (e) {
          var t, n, a = {};
          a[f.itemName] = n = d = y.matches[e].model, t = f.modelMapper(y, a), p.$setViewValue(t), p.$render(), b(y, {
            $item: n,
            $model: t,
            $label: f.viewMapper(y, a)
          }), c[0].focus();
        }, c.bind('keydown', function (e) {
          0 !== y.matches.length && -1 !== l.indexOf(e.which) && (e.preventDefault(), 40 === e.which ? (y.activeIdx = (y.activeIdx + 1) % y.matches.length, y.$digest()) : 38 === e.which ? (y.activeIdx = (y.activeIdx ? y.activeIdx : y.matches.length) - 1, y.$digest()) : 13 === e.which || 9 === e.which ? y.$apply(function () {
            y.select(y.activeIdx);
          }) : 27 === e.which && (e.stopPropagation(), w(), y.$digest()));
        }), o.bind('click', function () {
          w(), y.$digest();
        }), c.after(e($)(y));
      }
    };
  }
]).directive('typeaheadPopup', function () {
  return {
    restrict: 'E',
    scope: {
      matches: '=',
      query: '=',
      active: '=',
      position: '=',
      select: '&'
    },
    replace: !0,
    templateUrl: 'template/typeahead/typeahead.html',
    link: function (e) {
      e.isOpen = function () {
        return e.matches.length > 0;
      }, e.isActive = function (t) {
        return e.active == t;
      }, e.selectActive = function (t) {
        e.active = t;
      }, e.selectMatch = function (t) {
        e.select({ activeIdx: t });
      };
    }
  };
}).filter('typeaheadHighlight', function () {
  function e(e) {
    return e.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
  }
  return function (t, n) {
    return n ? t.replace(RegExp(e(n), 'gi'), '<strong>$&</strong>') : n;
  };
}), angular.module('template/accordion/accordion-group.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/accordion/accordion-group.html', '<div class="accordion-group">\n  <div class="accordion-heading" ><a class="accordion-toggle" ng-click="isOpen = !isOpen" accordion-transclude="heading">{{heading}}</a></div>\n  <div class="accordion-body" collapse="!isOpen">\n    <div class="accordion-inner" ng-transclude></div>  </div>\n</div>');
  }
]), angular.module('template/accordion/accordion.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/accordion/accordion.html', '<div class="accordion" ng-transclude></div>');
  }
]), angular.module('template/alert/alert.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/alert/alert.html', '<div class=\'alert\' ng-class=\'type && "alert-" + type\'>\n    <button ng-show=\'closeable\' type=\'button\' class=\'close\' ng-click=\'close()\'>&times;</button>\n    <div ng-transclude></div>\n</div>\n');
  }
]), angular.module('template/carousel/carousel.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/carousel/carousel.html', '<div ng-mouseenter="pause()" ng-mouseleave="play()" class="carousel">\n    <ol class="carousel-indicators" ng-show="slides().length > 1">\n        <li ng-repeat="slide in slides()" ng-class="{active: isActive(slide)}" ng-click="select(slide)"></li>\n    </ol>\n    <div class="carousel-inner" ng-transclude></div>\n    <a ng-click="prev()" class="carousel-control left" ng-show="slides().length > 1">&lsaquo;</a>\n    <a ng-click="next()" class="carousel-control right" ng-show="slides().length > 1">&rsaquo;</a>\n</div>\n');
  }
]), angular.module('template/carousel/slide.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/carousel/slide.html', '<div ng-class="{\n    \'active\': leaving || (active && !entering),\n    \'prev\': (next || active) && direction==\'prev\',\n    \'next\': (next || active) && direction==\'next\',\n    \'right\': direction==\'prev\',\n    \'left\': direction==\'next\'\n  }" class="item" ng-transclude></div>\n');
  }
]), angular.module('template/datepicker/datepicker.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/datepicker/datepicker.html', '<table class="well well-large">\n  <thead>\n    <tr class="text-center">\n      <th><button class="btn pull-left" ng-click="move(-1)"><i class="icon-chevron-left"></i></button></th>\n      <th colspan="{{rows[0].length - 2 + showWeekNumbers}}"><button class="btn btn-block" ng-click="toggleMode()"><strong>{{title}}</strong></button></th>\n      <th><button class="btn pull-right" ng-click="move(1)"><i class="icon-chevron-right"></i></button></th>\n    </tr>\n    <tr class="text-center" ng-show="labels.length > 0">\n      <th ng-show="showWeekNumbers">#</th>\n      <th ng-repeat="label in labels">{{label}}</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat="row in rows">\n      <td ng-show="showWeekNumbers" class="text-center"><em>{{ getWeekNumber(row) }}</em></td>\n      <td ng-repeat="dt in row" class="text-center">\n        <button style="width:100%;" class="btn" ng-class="{\'btn-info\': dt.isSelected}" ng-click="select(dt.date)" ng-disabled="dt.disabled"><span ng-class="{muted: ! dt.isCurrent}">{{dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n');
  }
]), angular.module('template/dialog/message.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/dialog/message.html', '<div class="modal-header">\n\t<h3>{{ title }}</h3>\n</div>\n<div class="modal-body">\n\t<p>{{ message }}</p>\n</div>\n<div class="modal-footer">\n\t<button ng-repeat="btn in buttons" ng-click="close(btn.result)" class="btn" ng-class="btn.cssClass">{{ btn.label }}</button>\n</div>\n');
  }
]), angular.module('template/modal/backdrop.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/modal/backdrop.html', '<div class="modal-backdrop"></div>');
  }
]), angular.module('template/modal/window.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/modal/window.html', '<div class="modal in" ng-transclude></div>');
  }
]), angular.module('template/pagination/pager.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/pagination/pager.html', '<div class="pager">\n  <ul>\n    <li ng-repeat="page in pages" ng-class="{disabled: page.disabled, previous: page.previous, next: page.next}"><a ng-click="selectPage(page.number)">{{page.text}}</a></li>\n  </ul>\n</div>\n');
  }
]), angular.module('template/pagination/pagination.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/pagination/pagination.html', '<div class="pagination"><ul>\n  <li ng-repeat="page in pages" ng-class="{active: page.active, disabled: page.disabled}"><a ng-click="selectPage(page.number)">{{page.text}}</a></li>\n  </ul>\n</div>\n');
  }
]), angular.module('template/tooltip/tooltip-html-unsafe-popup.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/tooltip/tooltip-html-unsafe-popup.html', '<div class="tooltip {{placement}}" ng-class="{ in: isOpen(), fade: animation() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind-html-unsafe="content"></div>\n</div>\n');
  }
]), angular.module('template/tooltip/tooltip-popup.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/tooltip/tooltip-popup.html', '<div class="tooltip {{placement}}" ng-class="{ in: isOpen(), fade: animation() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind="content"></div>\n</div>\n');
  }
]), angular.module('template/popover/popover.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/popover/popover.html', '<div class="popover {{placement}}" ng-class="{ in: isOpen(), fade: animation() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="title" ng-show="title"></h3>\n      <div class="popover-content" ng-bind="content"></div>\n  </div>\n</div>\n');
  }
]), angular.module('template/progressbar/bar.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/progressbar/bar.html', '<div class="bar" ng-class=\'type && "bar-" + type\'></div>');
  }
]), angular.module('template/progressbar/progress.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/progressbar/progress.html', '<div class="progress"><progressbar ng-repeat="bar in bars" width="bar.to" old="bar.from" animate="bar.animate" type="bar.type"></progressbar></div>');
  }
]), angular.module('template/rating/rating.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/rating/rating.html', '<span ng-mouseleave="reset()">\n\t<i ng-repeat="number in range" ng-mouseenter="enter(number)" ng-click="rate(number)" ng-class="{\'icon-star\': number <= val, \'icon-star-empty\': number > val}"></i>\n</span>\n');
  }
]), angular.module('template/tabs/pane.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/tabs/pane.html', '<div class="tab-pane" ng-class="{active: selected}" ng-show="selected" ng-transclude></div>\n');
  }
]), angular.module('template/tabs/tab.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/tabs/tab.html', '<li ng-class="{active: active, disabled: disabled}">\n  <a ng-click="select()" tab-heading-transclude>{{heading}}</a>\n</li>\n');
  }
]), angular.module('template/tabs/tabs.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/tabs/tabs.html', '<div class="tabbable">\n  <ul class="nav nav-tabs">\n    <li ng-repeat="pane in panes" ng-class="{active:pane.selected}">\n      <a ng-click="select(pane)">{{pane.heading}}</a>\n    </li>\n  </ul>\n  <div class="tab-content" ng-transclude></div>\n</div>\n');
  }
]), angular.module('template/tabs/tabset.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/tabs/tabset.html', '\n<div class="tabbable">\n  <ul class="nav {{type && \'nav-\' + type}}" ng-class="{\'nav-stacked\': vertical}" ng-transclude>\n  </ul>\n  <div class="tab-content">\n    <div class="tab-pane" \n         ng-repeat="tab in tabs" \n         ng-class="{active: tab.active}"\n         tab-content-transclude="tab" tt="tab">\n    </div>\n  </div>\n</div>\n');
  }
]), angular.module('template/timepicker/timepicker.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/timepicker/timepicker.html', '<table class="form-inline">\n\t<tr class="text-center">\n\t\t<td><a ng-click="incrementHours()" class="btn btn-link"><i class="icon-chevron-up"></i></a></td>\n\t\t<td>&nbsp;</td>\n\t\t<td><a ng-click="incrementMinutes()" class="btn btn-link"><i class="icon-chevron-up"></i></a></td>\n\t\t<td ng-show="showMeridian"></td>\n\t</tr>\n\t<tr>\n\t\t<td class="control-group" ng-class="{\'error\': !validHours}"><input type="text" ng-model="hours" ng-change="updateHours()" class="span1 text-center" ng-mousewheel="incrementHours()" ng-readonly="readonlyInput" maxlength="2" /></td>\n\t\t<td>:</td>\n\t\t<td class="control-group" ng-class="{\'error\': !validMinutes}"><input type="text" ng-model="minutes" ng-change="updateMinutes()" class="span1 text-center" ng-readonly="readonlyInput" maxlength="2"></td>\n\t\t<td ng-show="showMeridian"><button ng-click="toggleMeridian()" class="btn text-center">{{meridian}}</button></td>\n\t</tr>\n\t<tr class="text-center">\n\t\t<td><a ng-click="decrementHours()" class="btn btn-link"><i class="icon-chevron-down"></i></a></td>\n\t\t<td>&nbsp;</td>\n\t\t<td><a ng-click="decrementMinutes()" class="btn btn-link"><i class="icon-chevron-down"></i></a></td>\n\t\t<td ng-show="showMeridian"></td>\n\t</tr>\n</table>');
  }
]), angular.module('template/typeahead/typeahead.html', []).run([
  '$templateCache',
  function (e) {
    e.put('template/typeahead/typeahead.html', '<ul class="typeahead dropdown-menu" ng-style="{display: isOpen()&&\'block\' || \'none\', top: position.top+\'px\', left: position.left+\'px\'}">\n    <li ng-repeat="match in matches" ng-class="{active: isActive($index) }" ng-mouseenter="selectActive($index)">\n        <a tabindex="-1" ng-click="selectMatch($index)" ng-bind-html-unsafe="match.label | typeaheadHighlight:query"></a>\n    </li>\n</ul>');
  }
]);
var Showdown = { extensions: {} }, forEach = Showdown.forEach = function (a, b) {
    if (typeof a.forEach == 'function')
      a.forEach(b);
    else {
      var c, d = a.length;
      for (c = 0; c < d; c++)
        b(a[c], c, a);
    }
  }, stdExtName = function (a) {
    return a.replace(/[_-]||\s/g, '').toLowerCase();
  };
Showdown.converter = function (a) {
  var b, c, d, e = 0, f = [], g = [];
  if (typeof module != 'undefind' && typeof exports != 'undefined' && typeof require != 'undefind') {
    var h = require('fs');
    if (h) {
      var i = h.readdirSync((__dirname || '.') + '/extensions').filter(function (a) {
          return ~a.indexOf('.js');
        }).map(function (a) {
          return a.replace(/\.js$/, '');
        });
      Showdown.forEach(i, function (a) {
        var b = stdExtName(a);
        Showdown.extensions[b] = require('./extensions/' + a);
      });
    }
  }
  a && a.extensions && Showdown.forEach(a.extensions, function (a) {
    typeof a == 'string' && (a = Showdown.extensions[stdExtName(a)]);
    if (typeof a != 'function')
      throw 'Extension \'' + a + '\' could not be loaded.  It was either not found or is not a valid extension.';
    Showdown.forEach(a(this), function (a) {
      a.type ? a.type === 'language' || a.type === 'lang' ? f.push(a) : (a.type === 'output' || a.type === 'html') && g.push(a) : g.push(a);
    });
  }), this.makeHtml = function (a) {
    return b = {}, c = {}, d = [], a = a.replace(/~/g, '~T'), a = a.replace(/\$/g, '~D'), a = a.replace(/\r\n/g, '\n'), a = a.replace(/\r/g, '\n'), a = '\n\n' + a + '\n\n', a = L(a), a = a.replace(/^[ \t]+$/gm, ''), Showdown.forEach(f, function (b) {
      a = j(b, a);
    }), a = y(a), a = l(a), a = k(a), a = n(a), a = J(a), a = a.replace(/~D/g, '$$'), a = a.replace(/~T/g, '~'), Showdown.forEach(g, function (b) {
      a = j(b, a);
    }), a;
  };
  var j = function (a, b) {
      if (a.regex) {
        var c = new RegExp(a.regex, 'g');
        return b.replace(c, a.replace);
      }
      if (a.filter)
        return a.filter(b);
    }, k = function (a) {
      return a += '~0', a = a.replace(/^[ ]{0,3}\[(.+)\]:[ \t]*\n?[ \t]*<?(\S+?)>?[ \t]*\n?[ \t]*(?:(\n*)["(](.+?)[")][ \t]*)?(?:\n+|(?=~0))/gm, function (a, d, e, f, g) {
        return d = d.toLowerCase(), b[d] = F(e), f ? f + g : (g && (c[d] = g.replace(/"/g, '&quot;')), '');
      }), a = a.replace(/~0/, ''), a;
    }, l = function (a) {
      a = a.replace(/\n/g, '\n\n');
      var b = 'p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del|style|section|header|footer|nav|article|aside', c = 'p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|style|section|header|footer|nav|article|aside';
      return a = a.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del)\b[^\r]*?\n<\/\2>[ \t]*(?=\n+))/gm, m), a = a.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|style|section|header|footer|nav|article|aside)\b[^\r]*?<\/\2>[ \t]*(?=\n+)\n)/gm, m), a = a.replace(/(\n[ ]{0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g, m), a = a.replace(/(\n\n[ ]{0,3}<!(--[^\r]*?--\s*)+>[ \t]*(?=\n{2,}))/g, m), a = a.replace(/(?:\n\n)([ ]{0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g, m), a = a.replace(/\n\n/g, '\n'), a;
    }, m = function (a, b) {
      var c = b;
      return c = c.replace(/\n\n/g, '\n'), c = c.replace(/^\n/, ''), c = c.replace(/\n+$/g, ''), c = '\n\n~K' + (d.push(c) - 1) + 'K\n\n', c;
    }, n = function (a) {
      a = u(a);
      var b = z('<hr />');
      return a = a.replace(/^[ ]{0,2}([ ]?\*[ ]?){3,}[ \t]*$/gm, b), a = a.replace(/^[ ]{0,2}([ ]?\-[ ]?){3,}[ \t]*$/gm, b), a = a.replace(/^[ ]{0,2}([ ]?\_[ ]?){3,}[ \t]*$/gm, b), a = w(a), a = x(a), a = D(a), a = l(a), a = E(a), a;
    }, o = function (a) {
      return a = A(a), a = p(a), a = G(a), a = s(a), a = q(a), a = H(a), a = F(a), a = C(a), a = a.replace(/  +\n/g, ' <br />\n'), a;
    }, p = function (a) {
      var b = /(<[a-z\/!$]("[^"]*"|'[^']*'|[^'">])*>|<!(--.*?--\s*)+>)/gi;
      return a = a.replace(b, function (a) {
        var b = a.replace(/(.)<\/?code>(?=.)/g, '$1`');
        return b = M(b, '\\`*_'), b;
      }), a;
    }, q = function (a) {
      return a = a.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g, r), a = a.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\]\([ \t]*()<?(.*?(?:\(.*?\).*?)?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g, r), a = a.replace(/(\[([^\[\]]+)\])()()()()()/g, r), a;
    }, r = function (a, d, e, f, g, h, i, j) {
      j == undefined && (j = '');
      var k = d, l = e, m = f.toLowerCase(), n = g, o = j;
      if (n == '') {
        m == '' && (m = l.toLowerCase().replace(/ ?\n/g, ' ')), n = '#' + m;
        if (b[m] != undefined)
          n = b[m], c[m] != undefined && (o = c[m]);
        else {
          if (!(k.search(/\(\s*\)$/m) > -1))
            return k;
          n = '';
        }
      }
      n = M(n, '*_');
      var p = '<a href="' + n + '"';
      return o != '' && (o = o.replace(/"/g, '&quot;'), o = M(o, '*_'), p += ' title="' + o + '"'), p += '>' + l + '</a>', p;
    }, s = function (a) {
      return a = a.replace(/(!\[(.*?)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g, t), a = a.replace(/(!\[(.*?)\]\s?\([ \t]*()<?(\S+?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g, t), a;
    }, t = function (a, d, e, f, g, h, i, j) {
      var k = d, l = e, m = f.toLowerCase(), n = g, o = j;
      o || (o = '');
      if (n == '') {
        m == '' && (m = l.toLowerCase().replace(/ ?\n/g, ' ')), n = '#' + m;
        if (b[m] == undefined)
          return k;
        n = b[m], c[m] != undefined && (o = c[m]);
      }
      l = l.replace(/"/g, '&quot;'), n = M(n, '*_');
      var p = '<img src="' + n + '" alt="' + l + '"';
      return o = o.replace(/"/g, '&quot;'), o = M(o, '*_'), p += ' title="' + o + '"', p += ' />', p;
    }, u = function (a) {
      function b(a) {
        return a.replace(/[^\w]/g, '').toLowerCase();
      }
      return a = a.replace(/^(.+)[ \t]*\n=+[ \t]*\n+/gm, function (a, c) {
        return z('<h1 id="' + b(c) + '">' + o(c) + '</h1>');
      }), a = a.replace(/^(.+)[ \t]*\n-+[ \t]*\n+/gm, function (a, c) {
        return z('<h2 id="' + b(c) + '">' + o(c) + '</h2>');
      }), a = a.replace(/^(\#{1,6})[ \t]*(.+?)[ \t]*\#*\n+/gm, function (a, c, d) {
        var e = c.length;
        return z('<h' + e + ' id="' + b(d) + '">' + o(d) + '</h' + e + '>');
      }), a;
    }, v, w = function (a) {
      a += '~0';
      var b = /^(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm;
      return e ? a = a.replace(b, function (a, b, c) {
        var d = b, e = c.search(/[*+-]/g) > -1 ? 'ul' : 'ol';
        d = d.replace(/\n{2,}/g, '\n\n\n');
        var f = v(d);
        return f = f.replace(/\s+$/, ''), f = '<' + e + '>' + f + '</' + e + '>\n', f;
      }) : (b = /(\n\n|^\n?)(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/g, a = a.replace(b, function (a, b, c, d) {
        var e = b, f = c, g = d.search(/[*+-]/g) > -1 ? 'ul' : 'ol', f = f.replace(/\n{2,}/g, '\n\n\n'), h = v(f);
        return h = e + '<' + g + '>\n' + h + '</' + g + '>\n', h;
      })), a = a.replace(/~0/, ''), a;
    };
  v = function (a) {
    return e++, a = a.replace(/\n{2,}$/, '\n'), a += '~0', a = a.replace(/(\n)?(^[ \t]*)([*+-]|\d+[.])[ \t]+([^\r]+?(\n{1,2}))(?=\n*(~0|\2([*+-]|\d+[.])[ \t]+))/gm, function (a, b, c, d, e) {
      var f = e, g = b, h = c;
      return g || f.search(/\n{2,}/) > -1 ? f = n(K(f)) : (f = w(K(f)), f = f.replace(/\n$/, ''), f = o(f)), '<li>' + f + '</li>\n';
    }), a = a.replace(/~0/g, ''), e--, a;
  };
  var x = function (a) {
      return a += '~0', a = a.replace(/(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=~0))/g, function (a, b, c) {
        var d = b, e = c;
        return d = B(K(d)), d = L(d), d = d.replace(/^\n+/g, ''), d = d.replace(/\n+$/g, ''), d = '<pre><code>' + d + '\n</code></pre>', z(d) + e;
      }), a = a.replace(/~0/, ''), a;
    }, y = function (a) {
      return a += '~0', a = a.replace(/(?:^|\n)```(.*)\n([\s\S]*?)\n```/g, function (a, b, c) {
        var d = b, e = c;
        return e = B(e), e = L(e), e = e.replace(/^\n+/g, ''), e = e.replace(/\n+$/g, ''), e = '<pre><code' + (d ? ' class="' + d + '"' : '') + '>' + e + '\n</code></pre>', z(e);
      }), a = a.replace(/~0/, ''), a;
    }, z = function (a) {
      return a = a.replace(/(^\n+|\n+$)/g, ''), '\n\n~K' + (d.push(a) - 1) + 'K\n\n';
    }, A = function (a) {
      return a = a.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm, function (a, b, c, d, e) {
        var f = d;
        return f = f.replace(/^([ \t]*)/g, ''), f = f.replace(/[ \t]*$/g, ''), f = B(f), b + '<code>' + f + '</code>';
      }), a;
    }, B = function (a) {
      return a = a.replace(/&/g, '&amp;'), a = a.replace(/</g, '&lt;'), a = a.replace(/>/g, '&gt;'), a = M(a, '*_{}[]\\', !1), a;
    }, C = function (a) {
      return a = a.replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g, '<strong>$2</strong>'), a = a.replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g, '<em>$2</em>'), a;
    }, D = function (a) {
      return a = a.replace(/((^[ \t]*>[ \t]?.+\n(.+\n)*\n*)+)/gm, function (a, b) {
        var c = b;
        return c = c.replace(/^[ \t]*>[ \t]?/gm, '~0'), c = c.replace(/~0/g, ''), c = c.replace(/^[ \t]+$/gm, ''), c = n(c), c = c.replace(/(^|\n)/g, '$1  '), c = c.replace(/(\s*<pre>[^\r]+?<\/pre>)/gm, function (a, b) {
          var c = b;
          return c = c.replace(/^  /gm, '~0'), c = c.replace(/~0/g, ''), c;
        }), z('<blockquote>\n' + c + '\n</blockquote>');
      }), a;
    }, E = function (a) {
      a = a.replace(/^\n+/g, ''), a = a.replace(/\n+$/g, '');
      var b = a.split(/\n{2,}/g), c = [], e = b.length;
      for (var f = 0; f < e; f++) {
        var g = b[f];
        g.search(/~K(\d+)K/g) >= 0 ? c.push(g) : g.search(/\S/) >= 0 && (g = o(g), g = g.replace(/^([ \t]*)/g, '<p>'), g += '</p>', c.push(g));
      }
      e = c.length;
      for (var f = 0; f < e; f++)
        while (c[f].search(/~K(\d+)K/) >= 0) {
          var h = d[RegExp.$1];
          h = h.replace(/\$/g, '$$$$'), c[f] = c[f].replace(/~K\d+K/, h);
        }
      return c.join('\n\n');
    }, F = function (a) {
      return a = a.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g, '&amp;'), a = a.replace(/<(?![a-z\/?\$!])/gi, '&lt;'), a;
    }, G = function (a) {
      return a = a.replace(/\\(\\)/g, N), a = a.replace(/\\([`*_{}\[\]()>#+-.!])/g, N), a;
    }, H = function (a) {
      return a = a.replace(/<((https?|ftp|dict):[^'">\s]+)>/gi, '<a href="$1">$1</a>'), a = a.replace(/<(?:mailto:)?([-.\w]+\@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi, function (a, b) {
        return I(J(b));
      }), a;
    }, I = function (a) {
      var b = [
          function (a) {
            return '&#' + a.charCodeAt(0) + ';';
          },
          function (a) {
            return '&#x' + a.charCodeAt(0).toString(16) + ';';
          },
          function (a) {
            return a;
          }
        ];
      return a = 'mailto:' + a, a = a.replace(/./g, function (a) {
        if (a == '@')
          a = b[Math.floor(Math.random() * 2)](a);
        else if (a != ':') {
          var c = Math.random();
          a = c > 0.9 ? b[2](a) : c > 0.45 ? b[1](a) : b[0](a);
        }
        return a;
      }), a = '<a href="' + a + '">' + a + '</a>', a = a.replace(/">.+:/g, '">'), a;
    }, J = function (a) {
      return a = a.replace(/~E(\d+)E/g, function (a, b) {
        var c = parseInt(b);
        return String.fromCharCode(c);
      }), a;
    }, K = function (a) {
      return a = a.replace(/^(\t|[ ]{1,4})/gm, '~0'), a = a.replace(/~0/g, ''), a;
    }, L = function (a) {
      return a = a.replace(/\t(?=\t)/g, '    '), a = a.replace(/\t/g, '~A~B'), a = a.replace(/~B(.+?)~A/g, function (a, b, c) {
        var d = b, e = 4 - d.length % 4;
        for (var f = 0; f < e; f++)
          d += ' ';
        return d;
      }), a = a.replace(/~A/g, '    '), a = a.replace(/~B/g, ''), a;
    }, M = function (a, b, c) {
      var d = '([' + b.replace(/([\[\]\\])/g, '\\$1') + '])';
      c && (d = '\\\\' + d);
      var e = new RegExp(d, 'g');
      return a = a.replace(e, N), a;
    }, N = function (a, b) {
      var c = b.charCodeAt(0);
      return '~E' + c + 'E';
    };
}, typeof module != 'undefined' && (module.exports = Showdown), typeof define == 'function' && define.amd && define('showdown', function () {
  return Showdown;
});
(function (undefined) {
  var moment, VERSION = '2.1.0', round = Math.round, i, languages = {}, hasModule = typeof module !== 'undefined' && module.exports, aspNetJsonRegex = /^\/?Date\((\-?\d+)/i, aspNetTimeSpanJsonRegex = /(\-)?(\d*)?\.?(\d+)\:(\d+)\:(\d+)\.?(\d{3})?/, formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|SS?S?|X|zz?|ZZ?|.)/g, localFormattingTokens = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g, parseTokenOneOrTwoDigits = /\d\d?/, parseTokenOneToThreeDigits = /\d{1,3}/, parseTokenThreeDigits = /\d{3}/, parseTokenFourDigits = /\d{1,4}/, parseTokenSixDigits = /[+\-]?\d{1,6}/, parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/i, parseTokenT = /T/i, parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, isoRegex = /^\s*\d{4}-\d\d-\d\d((T| )(\d\d(:\d\d(:\d\d(\.\d\d?\d?)?)?)?)?([\+\-]\d\d:?\d\d)?)?/, isoFormat = 'YYYY-MM-DDTHH:mm:ssZ', isoTimes = [
      [
        'HH:mm:ss.S',
        /(T| )\d\d:\d\d:\d\d\.\d{1,3}/
      ],
      [
        'HH:mm:ss',
        /(T| )\d\d:\d\d:\d\d/
      ],
      [
        'HH:mm',
        /(T| )\d\d:\d\d/
      ],
      [
        'HH',
        /(T| )\d\d/
      ]
    ], parseTimezoneChunker = /([\+\-]|\d\d)/gi, proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'), unitMillisecondFactors = {
      'Milliseconds': 1,
      'Seconds': 1000,
      'Minutes': 60000,
      'Hours': 3600000,
      'Days': 86400000,
      'Months': 2592000000,
      'Years': 31536000000
    }, unitAliases = {
      ms: 'millisecond',
      s: 'second',
      m: 'minute',
      h: 'hour',
      d: 'day',
      w: 'week',
      M: 'month',
      y: 'year'
    }, formatFunctions = {}, ordinalizeTokens = 'DDD w W M D d'.split(' '), paddedTokens = 'M D H h m s w W'.split(' '), formatTokenFunctions = {
      M: function () {
        return this.month() + 1;
      },
      MMM: function (format) {
        return this.lang().monthsShort(this, format);
      },
      MMMM: function (format) {
        return this.lang().months(this, format);
      },
      D: function () {
        return this.date();
      },
      DDD: function () {
        return this.dayOfYear();
      },
      d: function () {
        return this.day();
      },
      dd: function (format) {
        return this.lang().weekdaysMin(this, format);
      },
      ddd: function (format) {
        return this.lang().weekdaysShort(this, format);
      },
      dddd: function (format) {
        return this.lang().weekdays(this, format);
      },
      w: function () {
        return this.week();
      },
      W: function () {
        return this.isoWeek();
      },
      YY: function () {
        return leftZeroFill(this.year() % 100, 2);
      },
      YYYY: function () {
        return leftZeroFill(this.year(), 4);
      },
      YYYYY: function () {
        return leftZeroFill(this.year(), 5);
      },
      gg: function () {
        return leftZeroFill(this.weekYear() % 100, 2);
      },
      gggg: function () {
        return this.weekYear();
      },
      ggggg: function () {
        return leftZeroFill(this.weekYear(), 5);
      },
      GG: function () {
        return leftZeroFill(this.isoWeekYear() % 100, 2);
      },
      GGGG: function () {
        return this.isoWeekYear();
      },
      GGGGG: function () {
        return leftZeroFill(this.isoWeekYear(), 5);
      },
      e: function () {
        return this.weekday();
      },
      E: function () {
        return this.isoWeekday();
      },
      a: function () {
        return this.lang().meridiem(this.hours(), this.minutes(), true);
      },
      A: function () {
        return this.lang().meridiem(this.hours(), this.minutes(), false);
      },
      H: function () {
        return this.hours();
      },
      h: function () {
        return this.hours() % 12 || 12;
      },
      m: function () {
        return this.minutes();
      },
      s: function () {
        return this.seconds();
      },
      S: function () {
        return ~~(this.milliseconds() / 100);
      },
      SS: function () {
        return leftZeroFill(~~(this.milliseconds() / 10), 2);
      },
      SSS: function () {
        return leftZeroFill(this.milliseconds(), 3);
      },
      Z: function () {
        var a = -this.zone(), b = '+';
        if (a < 0) {
          a = -a;
          b = '-';
        }
        return b + leftZeroFill(~~(a / 60), 2) + ':' + leftZeroFill(~~a % 60, 2);
      },
      ZZ: function () {
        var a = -this.zone(), b = '+';
        if (a < 0) {
          a = -a;
          b = '-';
        }
        return b + leftZeroFill(~~(10 * a / 6), 4);
      },
      z: function () {
        return this.zoneAbbr();
      },
      zz: function () {
        return this.zoneName();
      },
      X: function () {
        return this.unix();
      }
    };
  function padToken(func, count) {
    return function (a) {
      return leftZeroFill(func.call(this, a), count);
    };
  }
  function ordinalizeToken(func, period) {
    return function (a) {
      return this.lang().ordinal(func.call(this, a), period);
    };
  }
  while (ordinalizeTokens.length) {
    i = ordinalizeTokens.pop();
    formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
  }
  while (paddedTokens.length) {
    i = paddedTokens.pop();
    formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
  }
  formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);
  function Language() {
  }
  function Moment(config) {
    extend(this, config);
  }
  function Duration(duration) {
    var years = duration.years || duration.year || duration.y || 0, months = duration.months || duration.month || duration.M || 0, weeks = duration.weeks || duration.week || duration.w || 0, days = duration.days || duration.day || duration.d || 0, hours = duration.hours || duration.hour || duration.h || 0, minutes = duration.minutes || duration.minute || duration.m || 0, seconds = duration.seconds || duration.second || duration.s || 0, milliseconds = duration.milliseconds || duration.millisecond || duration.ms || 0;
    this._input = duration;
    this._milliseconds = milliseconds + seconds * 1000 + minutes * 60000 + hours * 3600000;
    this._days = days + weeks * 7;
    this._months = months + years * 12;
    this._data = {};
    this._bubble();
  }
  function extend(a, b) {
    for (var i in b) {
      if (b.hasOwnProperty(i)) {
        a[i] = b[i];
      }
    }
    return a;
  }
  function absRound(number) {
    if (number < 0) {
      return Math.ceil(number);
    } else {
      return Math.floor(number);
    }
  }
  function leftZeroFill(number, targetLength) {
    var output = number + '';
    while (output.length < targetLength) {
      output = '0' + output;
    }
    return output;
  }
  function addOrSubtractDurationFromMoment(mom, duration, isAdding, ignoreUpdateOffset) {
    var milliseconds = duration._milliseconds, days = duration._days, months = duration._months, minutes, hours, currentDate;
    if (milliseconds) {
      mom._d.setTime(+mom._d + milliseconds * isAdding);
    }
    if (days || months) {
      minutes = mom.minute();
      hours = mom.hour();
    }
    if (days) {
      mom.date(mom.date() + days * isAdding);
    }
    if (months) {
      mom.month(mom.month() + months * isAdding);
    }
    if (milliseconds && !ignoreUpdateOffset) {
      moment.updateOffset(mom);
    }
    if (days || months) {
      mom.minute(minutes);
      mom.hour(hours);
    }
  }
  function isArray(input) {
    return Object.prototype.toString.call(input) === '[object Array]';
  }
  function compareArrays(array1, array2) {
    var len = Math.min(array1.length, array2.length), lengthDiff = Math.abs(array1.length - array2.length), diffs = 0, i;
    for (i = 0; i < len; i++) {
      if (~~array1[i] !== ~~array2[i]) {
        diffs++;
      }
    }
    return diffs + lengthDiff;
  }
  function normalizeUnits(units) {
    return units ? unitAliases[units] || units.toLowerCase().replace(/(.)s$/, '$1') : units;
  }
  Language.prototype = {
    set: function (config) {
      var prop, i;
      for (i in config) {
        prop = config[i];
        if (typeof prop === 'function') {
          this[i] = prop;
        } else {
          this['_' + i] = prop;
        }
      }
    },
    _months: 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
    months: function (m) {
      return this._months[m.month()];
    },
    _monthsShort: 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
    monthsShort: function (m) {
      return this._monthsShort[m.month()];
    },
    monthsParse: function (monthName) {
      var i, mom, regex;
      if (!this._monthsParse) {
        this._monthsParse = [];
      }
      for (i = 0; i < 12; i++) {
        if (!this._monthsParse[i]) {
          mom = moment([
            2000,
            i
          ]);
          regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
          this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
        }
        if (this._monthsParse[i].test(monthName)) {
          return i;
        }
      }
    },
    _weekdays: 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
    weekdays: function (m) {
      return this._weekdays[m.day()];
    },
    _weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
    weekdaysShort: function (m) {
      return this._weekdaysShort[m.day()];
    },
    _weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
    weekdaysMin: function (m) {
      return this._weekdaysMin[m.day()];
    },
    weekdaysParse: function (weekdayName) {
      var i, mom, regex;
      if (!this._weekdaysParse) {
        this._weekdaysParse = [];
      }
      for (i = 0; i < 7; i++) {
        if (!this._weekdaysParse[i]) {
          mom = moment([
            2000,
            1
          ]).day(i);
          regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
          this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
        }
        if (this._weekdaysParse[i].test(weekdayName)) {
          return i;
        }
      }
    },
    _longDateFormat: {
      LT: 'h:mm A',
      L: 'MM/DD/YYYY',
      LL: 'MMMM D YYYY',
      LLL: 'MMMM D YYYY LT',
      LLLL: 'dddd, MMMM D YYYY LT'
    },
    longDateFormat: function (key) {
      var output = this._longDateFormat[key];
      if (!output && this._longDateFormat[key.toUpperCase()]) {
        output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
          return val.slice(1);
        });
        this._longDateFormat[key] = output;
      }
      return output;
    },
    isPM: function (input) {
      return (input + '').toLowerCase()[0] === 'p';
    },
    _meridiemParse: /[ap]\.?m?\.?/i,
    meridiem: function (hours, minutes, isLower) {
      if (hours > 11) {
        return isLower ? 'pm' : 'PM';
      } else {
        return isLower ? 'am' : 'AM';
      }
    },
    _calendar: {
      sameDay: '[Today at] LT',
      nextDay: '[Tomorrow at] LT',
      nextWeek: 'dddd [at] LT',
      lastDay: '[Yesterday at] LT',
      lastWeek: '[Last] dddd [at] LT',
      sameElse: 'L'
    },
    calendar: function (key, mom) {
      var output = this._calendar[key];
      return typeof output === 'function' ? output.apply(mom) : output;
    },
    _relativeTime: {
      future: 'in %s',
      past: '%s ago',
      s: 'a few seconds',
      m: 'a minute',
      mm: '%d minutes',
      h: 'an hour',
      hh: '%d hours',
      d: 'a day',
      dd: '%d days',
      M: 'a month',
      MM: '%d months',
      y: 'a year',
      yy: '%d years'
    },
    relativeTime: function (number, withoutSuffix, string, isFuture) {
      var output = this._relativeTime[string];
      return typeof output === 'function' ? output(number, withoutSuffix, string, isFuture) : output.replace(/%d/i, number);
    },
    pastFuture: function (diff, output) {
      var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
      return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
    },
    ordinal: function (number) {
      return this._ordinal.replace('%d', number);
    },
    _ordinal: '%d',
    preparse: function (string) {
      return string;
    },
    postformat: function (string) {
      return string;
    },
    week: function (mom) {
      return weekOfYear(mom, this._week.dow, this._week.doy).week;
    },
    _week: {
      dow: 0,
      doy: 6
    }
  };
  function loadLang(key, values) {
    values.abbr = key;
    if (!languages[key]) {
      languages[key] = new Language();
    }
    languages[key].set(values);
    return languages[key];
  }
  function getLangDefinition(key) {
    if (!key) {
      return moment.fn._lang;
    }
    if (!languages[key] && hasModule) {
      try {
        require('./lang/' + key);
      } catch (e) {
        return moment.fn._lang;
      }
    }
    return languages[key];
  }
  function removeFormattingTokens(input) {
    if (input.match(/\[.*\]/)) {
      return input.replace(/^\[|\]$/g, '');
    }
    return input.replace(/\\/g, '');
  }
  function makeFormatFunction(format) {
    var array = format.match(formattingTokens), i, length;
    for (i = 0, length = array.length; i < length; i++) {
      if (formatTokenFunctions[array[i]]) {
        array[i] = formatTokenFunctions[array[i]];
      } else {
        array[i] = removeFormattingTokens(array[i]);
      }
    }
    return function (mom) {
      var output = '';
      for (i = 0; i < length; i++) {
        output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
      }
      return output;
    };
  }
  function formatMoment(m, format) {
    var i = 5;
    function replaceLongDateFormatTokens(input) {
      return m.lang().longDateFormat(input) || input;
    }
    while (i-- && localFormattingTokens.test(format)) {
      format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
    }
    if (!formatFunctions[format]) {
      formatFunctions[format] = makeFormatFunction(format);
    }
    return formatFunctions[format](m);
  }
  function getParseRegexForToken(token, config) {
    switch (token) {
    case 'DDDD':
      return parseTokenThreeDigits;
    case 'YYYY':
      return parseTokenFourDigits;
    case 'YYYYY':
      return parseTokenSixDigits;
    case 'S':
    case 'SS':
    case 'SSS':
    case 'DDD':
      return parseTokenOneToThreeDigits;
    case 'MMM':
    case 'MMMM':
    case 'dd':
    case 'ddd':
    case 'dddd':
      return parseTokenWord;
    case 'a':
    case 'A':
      return getLangDefinition(config._l)._meridiemParse;
    case 'X':
      return parseTokenTimestampMs;
    case 'Z':
    case 'ZZ':
      return parseTokenTimezone;
    case 'T':
      return parseTokenT;
    case 'MM':
    case 'DD':
    case 'YY':
    case 'HH':
    case 'hh':
    case 'mm':
    case 'ss':
    case 'M':
    case 'D':
    case 'd':
    case 'H':
    case 'h':
    case 'm':
    case 's':
      return parseTokenOneOrTwoDigits;
    default:
      return new RegExp(token.replace('\\', ''));
    }
  }
  function timezoneMinutesFromString(string) {
    var tzchunk = (parseTokenTimezone.exec(string) || [])[0], parts = (tzchunk + '').match(parseTimezoneChunker) || [
        '-',
        0,
        0
      ], minutes = +(parts[1] * 60) + ~~parts[2];
    return parts[0] === '+' ? -minutes : minutes;
  }
  function addTimeToArrayFromToken(token, input, config) {
    var a, datePartArray = config._a;
    switch (token) {
    case 'M':
    case 'MM':
      datePartArray[1] = input == null ? 0 : ~~input - 1;
      break;
    case 'MMM':
    case 'MMMM':
      a = getLangDefinition(config._l).monthsParse(input);
      if (a != null) {
        datePartArray[1] = a;
      } else {
        config._isValid = false;
      }
      break;
    case 'D':
    case 'DD':
    case 'DDD':
    case 'DDDD':
      if (input != null) {
        datePartArray[2] = ~~input;
      }
      break;
    case 'YY':
      datePartArray[0] = ~~input + (~~input > 68 ? 1900 : 2000);
      break;
    case 'YYYY':
    case 'YYYYY':
      datePartArray[0] = ~~input;
      break;
    case 'a':
    case 'A':
      config._isPm = getLangDefinition(config._l).isPM(input);
      break;
    case 'H':
    case 'HH':
    case 'h':
    case 'hh':
      datePartArray[3] = ~~input;
      break;
    case 'm':
    case 'mm':
      datePartArray[4] = ~~input;
      break;
    case 's':
    case 'ss':
      datePartArray[5] = ~~input;
      break;
    case 'S':
    case 'SS':
    case 'SSS':
      datePartArray[6] = ~~(('0.' + input) * 1000);
      break;
    case 'X':
      config._d = new Date(parseFloat(input) * 1000);
      break;
    case 'Z':
    case 'ZZ':
      config._useUTC = true;
      config._tzm = timezoneMinutesFromString(input);
      break;
    }
    if (input == null) {
      config._isValid = false;
    }
  }
  function dateFromArray(config) {
    var i, date, input = [];
    if (config._d) {
      return;
    }
    for (i = 0; i < 7; i++) {
      config._a[i] = input[i] = config._a[i] == null ? i === 2 ? 1 : 0 : config._a[i];
    }
    input[3] += ~~((config._tzm || 0) / 60);
    input[4] += ~~((config._tzm || 0) % 60);
    date = new Date(0);
    if (config._useUTC) {
      date.setUTCFullYear(input[0], input[1], input[2]);
      date.setUTCHours(input[3], input[4], input[5], input[6]);
    } else {
      date.setFullYear(input[0], input[1], input[2]);
      date.setHours(input[3], input[4], input[5], input[6]);
    }
    config._d = date;
  }
  function makeDateFromStringAndFormat(config) {
    var tokens = config._f.match(formattingTokens), string = config._i, i, parsedInput;
    config._a = [];
    for (i = 0; i < tokens.length; i++) {
      parsedInput = (getParseRegexForToken(tokens[i], config).exec(string) || [])[0];
      if (parsedInput) {
        string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
      }
      if (formatTokenFunctions[tokens[i]]) {
        addTimeToArrayFromToken(tokens[i], parsedInput, config);
      }
    }
    if (string) {
      config._il = string;
    }
    if (config._isPm && config._a[3] < 12) {
      config._a[3] += 12;
    }
    if (config._isPm === false && config._a[3] === 12) {
      config._a[3] = 0;
    }
    dateFromArray(config);
  }
  function makeDateFromStringAndArray(config) {
    var tempConfig, tempMoment, bestMoment, scoreToBeat = 99, i, currentScore;
    for (i = 0; i < config._f.length; i++) {
      tempConfig = extend({}, config);
      tempConfig._f = config._f[i];
      makeDateFromStringAndFormat(tempConfig);
      tempMoment = new Moment(tempConfig);
      currentScore = compareArrays(tempConfig._a, tempMoment.toArray());
      if (tempMoment._il) {
        currentScore += tempMoment._il.length;
      }
      if (currentScore < scoreToBeat) {
        scoreToBeat = currentScore;
        bestMoment = tempMoment;
      }
    }
    extend(config, bestMoment);
  }
  function makeDateFromString(config) {
    var i, string = config._i, match = isoRegex.exec(string);
    if (match) {
      config._f = 'YYYY-MM-DD' + (match[2] || ' ');
      for (i = 0; i < 4; i++) {
        if (isoTimes[i][1].exec(string)) {
          config._f += isoTimes[i][0];
          break;
        }
      }
      if (parseTokenTimezone.exec(string)) {
        config._f += ' Z';
      }
      makeDateFromStringAndFormat(config);
    } else {
      config._d = new Date(string);
    }
  }
  function makeDateFromInput(config) {
    var input = config._i, matched = aspNetJsonRegex.exec(input);
    if (input === undefined) {
      config._d = new Date();
    } else if (matched) {
      config._d = new Date(+matched[1]);
    } else if (typeof input === 'string') {
      makeDateFromString(config);
    } else if (isArray(input)) {
      config._a = input.slice(0);
      dateFromArray(config);
    } else {
      config._d = input instanceof Date ? new Date(+input) : new Date(input);
    }
  }
  function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang) {
    return lang.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
  }
  function relativeTime(milliseconds, withoutSuffix, lang) {
    var seconds = round(Math.abs(milliseconds) / 1000), minutes = round(seconds / 60), hours = round(minutes / 60), days = round(hours / 24), years = round(days / 365), args = seconds < 45 && [
        's',
        seconds
      ] || minutes === 1 && ['m'] || minutes < 45 && [
        'mm',
        minutes
      ] || hours === 1 && ['h'] || hours < 22 && [
        'hh',
        hours
      ] || days === 1 && ['d'] || days <= 25 && [
        'dd',
        days
      ] || days <= 45 && ['M'] || days < 345 && [
        'MM',
        round(days / 30)
      ] || years === 1 && ['y'] || [
        'yy',
        years
      ];
    args[2] = withoutSuffix;
    args[3] = milliseconds > 0;
    args[4] = lang;
    return substituteTimeAgo.apply({}, args);
  }
  function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
    var end = firstDayOfWeekOfYear - firstDayOfWeek, daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(), adjustedMoment;
    if (daysToDayOfWeek > end) {
      daysToDayOfWeek -= 7;
    }
    if (daysToDayOfWeek < end - 7) {
      daysToDayOfWeek += 7;
    }
    adjustedMoment = moment(mom).add('d', daysToDayOfWeek);
    return {
      week: Math.ceil(adjustedMoment.dayOfYear() / 7),
      year: adjustedMoment.year()
    };
  }
  function makeMoment(config) {
    var input = config._i, format = config._f;
    if (input === null || input === '') {
      return null;
    }
    if (typeof input === 'string') {
      config._i = input = getLangDefinition().preparse(input);
    }
    if (moment.isMoment(input)) {
      config = extend({}, input);
      config._d = new Date(+input._d);
    } else if (format) {
      if (isArray(format)) {
        makeDateFromStringAndArray(config);
      } else {
        makeDateFromStringAndFormat(config);
      }
    } else {
      makeDateFromInput(config);
    }
    return new Moment(config);
  }
  moment = function (input, format, lang) {
    return makeMoment({
      _i: input,
      _f: format,
      _l: lang,
      _isUTC: false
    });
  };
  moment.utc = function (input, format, lang) {
    return makeMoment({
      _useUTC: true,
      _isUTC: true,
      _l: lang,
      _i: input,
      _f: format
    });
  };
  moment.unix = function (input) {
    return moment(input * 1000);
  };
  moment.duration = function (input, key) {
    var isDuration = moment.isDuration(input), isNumber = typeof input === 'number', duration = isDuration ? input._input : isNumber ? {} : input, matched = aspNetTimeSpanJsonRegex.exec(input), sign, ret;
    if (isNumber) {
      if (key) {
        duration[key] = input;
      } else {
        duration.milliseconds = input;
      }
    } else if (matched) {
      sign = matched[1] === '-' ? -1 : 1;
      duration = {
        y: 0,
        d: ~~matched[2] * sign,
        h: ~~matched[3] * sign,
        m: ~~matched[4] * sign,
        s: ~~matched[5] * sign,
        ms: ~~matched[6] * sign
      };
    }
    ret = new Duration(duration);
    if (isDuration && input.hasOwnProperty('_lang')) {
      ret._lang = input._lang;
    }
    return ret;
  };
  moment.version = VERSION;
  moment.defaultFormat = isoFormat;
  moment.updateOffset = function () {
  };
  moment.lang = function (key, values) {
    if (!key) {
      return moment.fn._lang._abbr;
    }
    if (values) {
      loadLang(key, values);
    } else if (!languages[key]) {
      getLangDefinition(key);
    }
    moment.duration.fn._lang = moment.fn._lang = getLangDefinition(key);
  };
  moment.langData = function (key) {
    if (key && key._lang && key._lang._abbr) {
      key = key._lang._abbr;
    }
    return getLangDefinition(key);
  };
  moment.isMoment = function (obj) {
    return obj instanceof Moment;
  };
  moment.isDuration = function (obj) {
    return obj instanceof Duration;
  };
  moment.fn = Moment.prototype = {
    clone: function () {
      return moment(this);
    },
    valueOf: function () {
      return +this._d + (this._offset || 0) * 60000;
    },
    unix: function () {
      return Math.floor(+this / 1000);
    },
    toString: function () {
      return this.format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
    },
    toDate: function () {
      return this._offset ? new Date(+this) : this._d;
    },
    toISOString: function () {
      return formatMoment(moment(this).utc(), 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
    },
    toArray: function () {
      var m = this;
      return [
        m.year(),
        m.month(),
        m.date(),
        m.hours(),
        m.minutes(),
        m.seconds(),
        m.milliseconds()
      ];
    },
    isValid: function () {
      if (this._isValid == null) {
        if (this._a) {
          this._isValid = !compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray());
        } else {
          this._isValid = !isNaN(this._d.getTime());
        }
      }
      return !!this._isValid;
    },
    utc: function () {
      return this.zone(0);
    },
    local: function () {
      this.zone(0);
      this._isUTC = false;
      return this;
    },
    format: function (inputString) {
      var output = formatMoment(this, inputString || moment.defaultFormat);
      return this.lang().postformat(output);
    },
    add: function (input, val) {
      var dur;
      if (typeof input === 'string') {
        dur = moment.duration(+val, input);
      } else {
        dur = moment.duration(input, val);
      }
      addOrSubtractDurationFromMoment(this, dur, 1);
      return this;
    },
    subtract: function (input, val) {
      var dur;
      if (typeof input === 'string') {
        dur = moment.duration(+val, input);
      } else {
        dur = moment.duration(input, val);
      }
      addOrSubtractDurationFromMoment(this, dur, -1);
      return this;
    },
    diff: function (input, units, asFloat) {
      var that = this._isUTC ? moment(input).zone(this._offset || 0) : moment(input).local(), zoneDiff = (this.zone() - that.zone()) * 60000, diff, output;
      units = normalizeUnits(units);
      if (units === 'year' || units === 'month') {
        diff = (this.daysInMonth() + that.daysInMonth()) * 43200000;
        output = (this.year() - that.year()) * 12 + (this.month() - that.month());
        output += (this - moment(this).startOf('month') - (that - moment(that).startOf('month'))) / diff;
        output -= (this.zone() - moment(this).startOf('month').zone() - (that.zone() - moment(that).startOf('month').zone())) * 60000 / diff;
        if (units === 'year') {
          output = output / 12;
        }
      } else {
        diff = this - that;
        output = units === 'second' ? diff / 1000 : units === 'minute' ? diff / 60000 : units === 'hour' ? diff / 3600000 : units === 'day' ? (diff - zoneDiff) / 86400000 : units === 'week' ? (diff - zoneDiff) / 604800000 : diff;
      }
      return asFloat ? output : absRound(output);
    },
    from: function (time, withoutSuffix) {
      return moment.duration(this.diff(time)).lang(this.lang()._abbr).humanize(!withoutSuffix);
    },
    fromNow: function (withoutSuffix) {
      return this.from(moment(), withoutSuffix);
    },
    calendar: function () {
      var diff = this.diff(moment().startOf('day'), 'days', true), format = diff < -6 ? 'sameElse' : diff < -1 ? 'lastWeek' : diff < 0 ? 'lastDay' : diff < 1 ? 'sameDay' : diff < 2 ? 'nextDay' : diff < 7 ? 'nextWeek' : 'sameElse';
      return this.format(this.lang().calendar(format, this));
    },
    isLeapYear: function () {
      var year = this.year();
      return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
    },
    isDST: function () {
      return this.zone() < this.clone().month(0).zone() || this.zone() < this.clone().month(5).zone();
    },
    day: function (input) {
      var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
      if (input != null) {
        if (typeof input === 'string') {
          input = this.lang().weekdaysParse(input);
          if (typeof input !== 'number') {
            return this;
          }
        }
        return this.add({ d: input - day });
      } else {
        return day;
      }
    },
    month: function (input) {
      var utc = this._isUTC ? 'UTC' : '', dayOfMonth, daysInMonth;
      if (input != null) {
        if (typeof input === 'string') {
          input = this.lang().monthsParse(input);
          if (typeof input !== 'number') {
            return this;
          }
        }
        dayOfMonth = this.date();
        this.date(1);
        this._d['set' + utc + 'Month'](input);
        this.date(Math.min(dayOfMonth, this.daysInMonth()));
        moment.updateOffset(this);
        return this;
      } else {
        return this._d['get' + utc + 'Month']();
      }
    },
    startOf: function (units) {
      units = normalizeUnits(units);
      switch (units) {
      case 'year':
        this.month(0);
      case 'month':
        this.date(1);
      case 'week':
      case 'day':
        this.hours(0);
      case 'hour':
        this.minutes(0);
      case 'minute':
        this.seconds(0);
      case 'second':
        this.milliseconds(0);
      }
      if (units === 'week') {
        this.weekday(0);
      }
      return this;
    },
    endOf: function (units) {
      return this.startOf(units).add(units, 1).subtract('ms', 1);
    },
    isAfter: function (input, units) {
      units = typeof units !== 'undefined' ? units : 'millisecond';
      return +this.clone().startOf(units) > +moment(input).startOf(units);
    },
    isBefore: function (input, units) {
      units = typeof units !== 'undefined' ? units : 'millisecond';
      return +this.clone().startOf(units) < +moment(input).startOf(units);
    },
    isSame: function (input, units) {
      units = typeof units !== 'undefined' ? units : 'millisecond';
      return +this.clone().startOf(units) === +moment(input).startOf(units);
    },
    min: function (other) {
      other = moment.apply(null, arguments);
      return other < this ? this : other;
    },
    max: function (other) {
      other = moment.apply(null, arguments);
      return other > this ? this : other;
    },
    zone: function (input) {
      var offset = this._offset || 0;
      if (input != null) {
        if (typeof input === 'string') {
          input = timezoneMinutesFromString(input);
        }
        if (Math.abs(input) < 16) {
          input = input * 60;
        }
        this._offset = input;
        this._isUTC = true;
        if (offset !== input) {
          addOrSubtractDurationFromMoment(this, moment.duration(offset - input, 'm'), 1, true);
        }
      } else {
        return this._isUTC ? offset : this._d.getTimezoneOffset();
      }
      return this;
    },
    zoneAbbr: function () {
      return this._isUTC ? 'UTC' : '';
    },
    zoneName: function () {
      return this._isUTC ? 'Coordinated Universal Time' : '';
    },
    daysInMonth: function () {
      return moment.utc([
        this.year(),
        this.month() + 1,
        0
      ]).date();
    },
    dayOfYear: function (input) {
      var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 86400000) + 1;
      return input == null ? dayOfYear : this.add('d', input - dayOfYear);
    },
    weekYear: function (input) {
      var year = weekOfYear(this, this.lang()._week.dow, this.lang()._week.doy).year;
      return input == null ? year : this.add('y', input - year);
    },
    isoWeekYear: function (input) {
      var year = weekOfYear(this, 1, 4).year;
      return input == null ? year : this.add('y', input - year);
    },
    week: function (input) {
      var week = this.lang().week(this);
      return input == null ? week : this.add('d', (input - week) * 7);
    },
    isoWeek: function (input) {
      var week = weekOfYear(this, 1, 4).week;
      return input == null ? week : this.add('d', (input - week) * 7);
    },
    weekday: function (input) {
      var weekday = (this._d.getDay() + 7 - this.lang()._week.dow) % 7;
      return input == null ? weekday : this.add('d', input - weekday);
    },
    isoWeekday: function (input) {
      return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
    },
    lang: function (key) {
      if (key === undefined) {
        return this._lang;
      } else {
        this._lang = getLangDefinition(key);
        return this;
      }
    }
  };
  function makeGetterAndSetter(name, key) {
    moment.fn[name] = moment.fn[name + 's'] = function (input) {
      var utc = this._isUTC ? 'UTC' : '';
      if (input != null) {
        this._d['set' + utc + key](input);
        moment.updateOffset(this);
        return this;
      } else {
        return this._d['get' + utc + key]();
      }
    };
  }
  for (i = 0; i < proxyGettersAndSetters.length; i++) {
    makeGetterAndSetter(proxyGettersAndSetters[i].toLowerCase().replace(/s$/, ''), proxyGettersAndSetters[i]);
  }
  makeGetterAndSetter('year', 'FullYear');
  moment.fn.days = moment.fn.day;
  moment.fn.months = moment.fn.month;
  moment.fn.weeks = moment.fn.week;
  moment.fn.isoWeeks = moment.fn.isoWeek;
  moment.fn.toJSON = moment.fn.toISOString;
  moment.duration.fn = Duration.prototype = {
    _bubble: function () {
      var milliseconds = this._milliseconds, days = this._days, months = this._months, data = this._data, seconds, minutes, hours, years;
      data.milliseconds = milliseconds % 1000;
      seconds = absRound(milliseconds / 1000);
      data.seconds = seconds % 60;
      minutes = absRound(seconds / 60);
      data.minutes = minutes % 60;
      hours = absRound(minutes / 60);
      data.hours = hours % 24;
      days += absRound(hours / 24);
      data.days = days % 30;
      months += absRound(days / 30);
      data.months = months % 12;
      years = absRound(months / 12);
      data.years = years;
    },
    weeks: function () {
      return absRound(this.days() / 7);
    },
    valueOf: function () {
      return this._milliseconds + this._days * 86400000 + this._months % 12 * 2592000000 + ~~(this._months / 12) * 31536000000;
    },
    humanize: function (withSuffix) {
      var difference = +this, output = relativeTime(difference, !withSuffix, this.lang());
      if (withSuffix) {
        output = this.lang().pastFuture(difference, output);
      }
      return this.lang().postformat(output);
    },
    add: function (input, val) {
      var dur = moment.duration(input, val);
      this._milliseconds += dur._milliseconds;
      this._days += dur._days;
      this._months += dur._months;
      this._bubble();
      return this;
    },
    subtract: function (input, val) {
      var dur = moment.duration(input, val);
      this._milliseconds -= dur._milliseconds;
      this._days -= dur._days;
      this._months -= dur._months;
      this._bubble();
      return this;
    },
    get: function (units) {
      units = normalizeUnits(units);
      return this[units.toLowerCase() + 's']();
    },
    as: function (units) {
      units = normalizeUnits(units);
      return this['as' + units.charAt(0).toUpperCase() + units.slice(1) + 's']();
    },
    lang: moment.fn.lang
  };
  function makeDurationGetter(name) {
    moment.duration.fn[name] = function () {
      return this._data[name];
    };
  }
  function makeDurationAsGetter(name, factor) {
    moment.duration.fn['as' + name] = function () {
      return +this / factor;
    };
  }
  for (i in unitMillisecondFactors) {
    if (unitMillisecondFactors.hasOwnProperty(i)) {
      makeDurationAsGetter(i, unitMillisecondFactors[i]);
      makeDurationGetter(i.toLowerCase());
    }
  }
  makeDurationAsGetter('Weeks', 604800000);
  moment.duration.fn.asMonths = function () {
    return (+this - this.years() * 31536000000) / 2592000000 + this.years() * 12;
  };
  moment.lang('en', {
    ordinal: function (number) {
      var b = number % 10, output = ~~(number % 100 / 10) === 1 ? 'th' : b === 1 ? 'st' : b === 2 ? 'nd' : b === 3 ? 'rd' : 'th';
      return number + output;
    }
  });
  if (hasModule) {
    module.exports = moment;
  }
  if (typeof ender === 'undefined') {
    this['moment'] = moment;
  }
  if (typeof define === 'function' && define.amd) {
    define('moment', [], function () {
      return moment;
    });
  }
}.call(this));