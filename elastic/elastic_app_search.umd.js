(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.ElasticAppSearch = {})));
}(this, (function (exports) { 'use strict';

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var defineProperty = function (obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  };

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  var objectWithoutProperties = function (obj, keys) {
    var target = {};

    for (var i in obj) {
      if (keys.indexOf(i) >= 0) continue;
      if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
      target[i] = obj[i];
    }

    return target;
  };

  var slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"]) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      }
    };
  }();

  var toArray = function (arr) {
    return Array.isArray(arr) ? arr : Array.from(arr);
  };

  var toConsumableArray = function (arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  /**
   * An individual search result
   */

  var ResultItem = function () {
    function ResultItem(data) {
      classCallCheck(this, ResultItem);

      if (data._group && data._group.length > 0) {
        data = _extends({}, data, {
          _group: data._group.map(function (nestedData) {
            return new ResultItem(nestedData);
          })
        });
      }
      this.data = data;
    }

    /**
     * Return the HTML-unsafe raw value for a field, if it exists
     *
     * @param {String} key - name of the field
     *
     * @returns {any} the raw value of the field
     */


    createClass(ResultItem, [{
      key: "getRaw",
      value: function getRaw(key) {
        return (this.data[key] || {}).raw;
      }

      /**
       * Return the HTML-safe snippet value for a field, if it exists
       *
       * @param {String} key - name of the field
       *
       * @returns {any} the snippet value of the field
       */

    }, {
      key: "getSnippet",
      value: function getSnippet(key) {
        return (this.data[key] || {}).snippet;
      }
    }]);
    return ResultItem;
  }();

  /**
   * A list of ResultItems and additional information returned by a search request
   */

  var ResultList = function ResultList(rawResults, rawInfo) {
    classCallCheck(this, ResultList);

    this.rawResults = rawResults;
    this.rawInfo = rawInfo;

    var results = new Array();
    rawResults.forEach(function (data) {
      results.push(new ResultItem(data));
    });

    this.results = results;
    this.info = rawInfo;
  };

  /**
   * A helper for working with the JSON structure which represent
   * filters in API requests.
   */
  var Filters = function () {
    function Filters() {
      var filtersJSON = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      classCallCheck(this, Filters);

      this.filtersJSON = filtersJSON;
    }

    createClass(Filters, [{
      key: "removeFilter",
      value: function removeFilter(filterKey) {
        var filtersMap = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.filtersJSON;

        function go(filterKey, filtersMap) {
          var filtered = Object.entries(filtersMap).reduce(function (acc, _ref) {
            var _ref2 = slicedToArray(_ref, 2),
                filterName = _ref2[0],
                filterValue = _ref2[1];

            if (filterName === filterKey) {
              return acc;
            }

            if (["all", "any", "none"].includes(filterName)) {
              var nestedFiltersArray = filterValue;
              filterValue = nestedFiltersArray.reduce(function (acc, nestedFiltersMap) {
                var updatedNestedFiltersMap = go(filterKey, nestedFiltersMap);
                if (updatedNestedFiltersMap) {
                  return acc.concat(updatedNestedFiltersMap);
                } else {
                  return acc;
                }
              }, []);
            }

            return _extends({}, acc, defineProperty({}, filterName, filterValue));
          }, {});

          if (Object.keys(filtered).length === 0) {
            return;
          }
          return filtered;
        }

        var filtered = go(filterKey, filtersMap);
        return new Filters(filtered);
      }
    }, {
      key: "getListOfAppliedFilters",
      value: function getListOfAppliedFilters() {
        var _this = this;

        var filters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.filtersJSON;

        var set$$1 = Object.entries(filters).reduce(function (acc, _ref3) {
          var _ref4 = slicedToArray(_ref3, 2),
              key = _ref4[0],
              value = _ref4[1];

          if (!["all", "any", "none"].includes(key)) {
            acc.add(key);
          } else {
            value.forEach(function (nestedValue) {
              Object.keys(nestedValue).forEach(function (nestedKey) {
                if (!["all", "any", "none"].includes(nestedKey)) {
                  acc.add(nestedKey);
                } else {
                  acc = new Set([].concat(toConsumableArray(acc), toConsumableArray(_this.getListOfAppliedFilters(nestedValue))));
                }
              });
            });
          }
          return acc;
        }, new Set());

        return Array.from(set$$1.values());
      }
    }]);
    return Filters;
  }();

  var version = "7.15.0";

  var QueryCache = function () {
    function QueryCache() {
      classCallCheck(this, QueryCache);

      this.cache = {};
    }

    createClass(QueryCache, [{
      key: "getKey",
      value: function getKey(method, url, params) {
        return method + url + JSON.stringify(params);
      }
    }, {
      key: "store",
      value: function store(key, response) {
        this.cache[key] = response;
      }
    }, {
      key: "retrieve",
      value: function retrieve(key) {
        return this.cache[key];
      }
    }]);
    return QueryCache;
  }();

  var cache = new QueryCache();

  function request(searchKey, apiEndpoint, path, params, cacheResponses) {
    var _ref = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {},
        additionalHeaders = _ref.additionalHeaders;

    var method = "POST";
    var key = cache.getKey(method, apiEndpoint + path, params);
    if (cacheResponses) {
      var cachedResult = cache.retrieve(key);
      if (cachedResult) {
        return Promise.resolve(cachedResult);
      }
    }

    return _request(method, searchKey, apiEndpoint, path, params, {
      additionalHeaders: additionalHeaders
    }).then(function (response) {
      return response.json().then(function (json) {
        var result = { response: response, json: json };
        if (cacheResponses) cache.store(key, result);
        return result;
      }).catch(function () {
        return { response: response, json: {} };
      });
    });
  }

  function _request(method, searchKey, apiEndpoint, path, params) {
    var _ref2 = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {},
        additionalHeaders = _ref2.additionalHeaders;

    var headers = new Headers(_extends({}, searchKey && { Authorization: "Bearer " + searchKey }, {
      "Content-Type": "application/json",
      "X-Swiftype-Client": "elastic-app-search-javascript",
      "X-Swiftype-Client-Version": version
    }, additionalHeaders));

    return fetch("" + apiEndpoint + path, {
      method: method,
      headers: headers,
      body: JSON.stringify(params),
      credentials: "include"
    });
  }

  var SEARCH_TYPES = {
    SEARCH: "SEARCH",
    MULTI_SEARCH: "MULTI_SEARCH"
  };

  /**
   * Omit a single key from an object
   */
  function omit(obj, keyToOmit) {
    if (!obj) return;
    var _ = obj[keyToOmit],
        rest = objectWithoutProperties(obj, [keyToOmit]);

    return rest;
  }

  function flatten(arrayOfArrays) {
    return [].concat.apply([], arrayOfArrays);
  }

  function formatResultsJSON(json) {
    return new ResultList(json.results, omit(json, "results"));
  }

  function handleErrorResponse(_ref) {
    var response = _ref.response,
        json = _ref.json;

    if (!response.ok) {
      var message = Array.isArray(json) ? " " + flatten(json.map(function (response) {
        return response.errors;
      })).join(", ") : "" + (json.errors ? " " + json.errors : "");
      throw new Error("[" + response.status + "]" + message);
    }
    return json;
  }

  var Client = function () {
    function Client(hostIdentifier, searchKey, engineName) {
      var _ref2 = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {},
          _ref2$endpointBase = _ref2.endpointBase,
          endpointBase = _ref2$endpointBase === undefined ? "" : _ref2$endpointBase,
          _ref2$cacheResponses = _ref2.cacheResponses,
          cacheResponses = _ref2$cacheResponses === undefined ? true : _ref2$cacheResponses,
          additionalHeaders = _ref2.additionalHeaders;

      classCallCheck(this, Client);

      this.additionalHeaders = additionalHeaders;
      this.searchKey = searchKey;
      this.cacheResponses = cacheResponses;
      this.engineName = engineName;
      this.apiEndpoint = endpointBase ? endpointBase + "/api/as/v1/" : "https://" + hostIdentifier + ".api.swiftype.com/api/as/v1/";
      this.searchPath = "engines/" + this.engineName + "/search";
      this.multiSearchPath = "engines/" + this.engineName + "/multi_search";
      this.querySuggestionPath = "engines/" + this.engineName + "/query_suggestion";
      this.clickPath = "engines/" + this.engineName + "/click";
    }

    /**
     * Sends a query suggestion request to the Elastic App Search Api
     *
     * @param {String} query String that is used to perform a query suggest.
     * @param {Object} options Object used for configuring the query suggest, like 'types' or 'size'
     * @returns {Promise<ResultList>} a Promise that returns results, otherwise throws an Error.
     */


    createClass(Client, [{
      key: "querySuggestion",
      value: function querySuggestion(query) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var params = Object.assign({ query: query }, options);

        return request(this.searchKey, this.apiEndpoint, this.querySuggestionPath, params, this.cacheResponses, { additionalHeaders: this.additionalHeaders }).then(handleErrorResponse);
      }

      /**
       * Sends a search request to the Elastic App Search Api
       *
       * @param {String} query String, Query, or Object that is used to perform a search request.
       * @param {Object} options Object used for configuring the search like search_fields and result_fields
       * @returns {Promise<ResultList>} a Promise that returns a {ResultList} when resolved, otherwise throws an Error.
       */

    }, {
      key: "search",
      value: function search(query) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var disjunctiveFacets = options.disjunctiveFacets,
            disjunctiveFacetsAnalyticsTags = options.disjunctiveFacetsAnalyticsTags,
            validOptions = objectWithoutProperties(options, ["disjunctiveFacets", "disjunctiveFacetsAnalyticsTags"]);


        var params = Object.assign({ query: query }, validOptions);

        if (disjunctiveFacets && disjunctiveFacets.length > 0) {
          return this._performDisjunctiveSearch(params, disjunctiveFacets, disjunctiveFacetsAnalyticsTags).then(formatResultsJSON);
        }
        return this._performSearch(params).then(formatResultsJSON);
      }

      /**
       * Sends multiple search requests to the Elastic App Search Api, using the
       * "multi_search" endpoint
       *
       * @param {Array[Object]} searches searches to send, valid keys are:
       * - query: String
       * - options: Object (optional)
       * @returns {Promise<[ResultList]>} a Promise that returns an array of {ResultList} when resolved, otherwise throws an Error.
       */

    }, {
      key: "multiSearch",
      value: function multiSearch(searches) {
        var params = searches.map(function (search) {
          return _extends({
            query: search.query
          }, search.options || {});
        });

        return this._performSearch({ queries: params }, SEARCH_TYPES.MULTI_SEARCH).then(function (responses) {
          return responses.map(formatResultsJSON);
        });
      }

      /*
       * A disjunctive search, as opposed to a regular search is used any time
       * a `disjunctiveFacet` option is provided to the `search` method. A
       * a disjunctive facet requires multiple API calls.
       *
       * Typically:
       *
       * 1 API call to get the base results
       * 1 additional API call to get the "disjunctive" facet counts for each
       * facet configured as "disjunctive".
       *
       * The additional API calls are required, because a "disjunctive" facet
       * is one where we want the counts for a facet as if there is no filter applied
       * to a particular field.
       *
       * After all queries are performed, we merge the facet values on the
       * additional requests into the facet values of the original request, thus
       * creating a single response with the disjunctive facet values.
       */

    }, {
      key: "_performDisjunctiveSearch",
      value: function _performDisjunctiveSearch(params, disjunctiveFacets) {
        var _this = this;

        var disjunctiveFacetsAnalyticsTags = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ["Facet-Only"];

        var baseQueryPromise = this._performSearch(params);

        var filters = new Filters(params.filters);
        var appliedFilers = filters.getListOfAppliedFilters();
        var listOfAppliedDisjunctiveFilters = appliedFilers.filter(function (filter) {
          return disjunctiveFacets.includes(filter);
        });

        if (!listOfAppliedDisjunctiveFilters.length) {
          return baseQueryPromise;
        }

        var page = params.page || {};

        // We intentionally drop passed analytics tags here so that we don't get
        // double counted search analytics in the dashboard from disjunctive
        // calls
        var analytics = params.analytics || {};
        analytics.tags = disjunctiveFacetsAnalyticsTags;

        var disjunctiveQueriesPromises = listOfAppliedDisjunctiveFilters.map(function (appliedDisjunctiveFilter) {
          return _this._performSearch(_extends({}, params, {
            filters: filters.removeFilter(appliedDisjunctiveFilter).filtersJSON,
            page: _extends({}, page, {
              // Set this to 0 for performance, since disjunctive queries
              // don't need results
              size: 0
            }),
            analytics: analytics,
            facets: defineProperty({}, appliedDisjunctiveFilter, params.facets[appliedDisjunctiveFilter])
          }));
        });

        return Promise.all([baseQueryPromise].concat(toConsumableArray(disjunctiveQueriesPromises))).then(function (_ref3) {
          var _ref4 = toArray(_ref3),
              baseQueryResults = _ref4[0],
              disjunctiveQueries = _ref4.slice(1);

          disjunctiveQueries.forEach(function (disjunctiveQueryResults) {
            var _Object$entries$ = slicedToArray(Object.entries(disjunctiveQueryResults.facets)[0], 2),
                facetName = _Object$entries$[0],
                facetValue = _Object$entries$[1];

            baseQueryResults.facets[facetName] = facetValue;
          });
          return baseQueryResults;
        });
      }
    }, {
      key: "_performSearch",
      value: function _performSearch(params) {
        var searchType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SEARCH_TYPES.SEARCH;

        var searchPath = searchType === SEARCH_TYPES.MULTI_SEARCH ? this.multiSearchPath : this.searchPath;
        return request(this.searchKey, this.apiEndpoint, searchPath + ".json", params, this.cacheResponses, { additionalHeaders: this.additionalHeaders }).then(handleErrorResponse);
      }

      /**
       * Sends a click event to the Elastic App Search Api, to track a click-through event
       *
       * @param {String} query Query that was used to perform the search request
       * @param {String} documentId ID of the document that was clicked
       * @param {String} requestId Request_id from search response
       * @param {String[]} tags Tags to categorize this request in the Dashboard
       * @returns {Promise} An empty Promise, otherwise throws an Error.
       */

    }, {
      key: "click",
      value: function click(_ref5) {
        var query = _ref5.query,
            documentId = _ref5.documentId,
            requestId = _ref5.requestId,
            _ref5$tags = _ref5.tags,
            tags = _ref5$tags === undefined ? [] : _ref5$tags;

        var params = {
          query: query,
          document_id: documentId,
          request_id: requestId,
          tags: tags
        };

        return request(this.searchKey, this.apiEndpoint, this.clickPath + ".json", params, this.cacheResponses, { additionalHeaders: this.additionalHeaders }).then(handleErrorResponse);
      }
    }]);
    return Client;
  }();

  function createClient(_ref) {
    var hostIdentifier = _ref.hostIdentifier,
        accountHostKey = _ref.accountHostKey,
        apiKey = _ref.apiKey,
        searchKey = _ref.searchKey,
        engineName = _ref.engineName,
        endpointBase = _ref.endpointBase,
        cacheResponses = _ref.cacheResponses,
        additionalHeaders = _ref.additionalHeaders;

    hostIdentifier = hostIdentifier || accountHostKey; // accountHostKey is deprecated
    searchKey = searchKey || apiKey; //apiKey is deprecated
    return new Client(hostIdentifier, searchKey, engineName, {
      endpointBase: endpointBase,
      cacheResponses: cacheResponses,
      additionalHeaders: additionalHeaders
    });
  }

  exports.createClient = createClient;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
