var code = `
function InterceptorExtension() {
  const pureFetch = window.fetch
  const originalXMLHttpRequestOpen = window.XMLHttpRequest.prototype.open
  const self = this
  self.interceptor = new Interceptor()

  function Interceptor() { 
    this.strategies = {
      fetch: {
        GET: [],
        POST: [],
        OPTIONS: [],
        DELETE: [],
        PUT: []
      },
      xhr: {
        GET: [],
        POST: [],
        OPTIONS: [],
        DELETE: [],
        PUT: []
      }
    }
  }

  // ajax interceptor 
  window.XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    const strategies = self.interceptor.strategies.xhr[method.toUpperCase()]
    const strategy = strategies.find((strategy) => locateStrategy(strategy, url))
    const oldready = this.onreadystatechange
    this.addEventListener('readystatechange', function() {
      if (strategy && [3,4].includes(this.readyState)) {
      	const responseIsJson = (this.getResponseHeader('Content-Type') === 'application/json')
        let responseText
        if (responseIsJson) {
        	responseText = JSON.stringify(strategy.callback(JSON.parse(this.responseText)))
        } else {
          responseText = strategy.callback(this.responseText)
        }
        Object.defineProperty(this, "response", {writable: true})
        Object.defineProperty(this, "responseText", {writable: true})
        this.responseText = responseText
        this.response = responseText
        oldready.call(this)
      } else {
        oldready.apply(this, arguments)
      }
    }, false);
    originalXMLHttpRequestOpen.apply(this, arguments)
  }


  // fetch interceptor
  window.fetch = async(...args) => {
    const url = args[0]
    const opts = args[1]
    const method = (opts && opts.method) || 'GET'
    
    const response = await pureFetch(...args)

    const strategies = self.interceptor.strategies.fetch[method.toUpperCase()]

    const strategy = strategies.find((strategy) => locateStrategy(strategy, url))

    if (strategy) {
      const clone = response.clone()
      const contentType = clone.headers.get('Content-Type')
      const text = await clone.text()
      let body
      if (contentType === "application/json") { 
    		body = JSON.stringify(strategy.callback(JSON.parse(text)))
      } else {
      	body = strategy.callback(text)
      }

      return {
        status: clone.status,
        statusText: clone.statusText,
        headers: clone.headers,
        text: async() => body,
        json: async() => JSON.parse(body)
      }
    }
    return response
  }

  function locateStrategy(strategy, url) {
    if (strategy.type === 'string' && strategy.match === url) {
      return true
    } else if(strategy.type === 'regexp') {
      const parts = /\/(.*)\/(.*)$/.exec(strategy.match);
      const restoredRegex = new RegExp(parts[1], parts[2]);
      if (restoredRegex.test(url)) { 
        return true
      }
    } else {
      return false
    }
  }
}

InterceptorExtension.prototype.register = function(verb, urlOrRegex, opts, cb) {
  if (opts.type === "fetch" || opts.type === "all") {   
    if(!this.interceptor.strategies['fetch'][verb]) { throw new Error(verb + ' not supported') }

    this.interceptor.strategies['fetch'][verb.toUpperCase()].push({ ...parseUrlOrRegex(urlOrRegex), callback: cb })
  }

  if (opts.type === "xhr" || opts.type === "all") {
    if(!this.interceptor.strategies['xhr'][verb]) { throw new Error(verb + ' not supported') }

    this.interceptor.strategies['xhr'][verb.toUpperCase()].push({ ...parseUrlOrRegex(urlOrRegex), callback: cb })
  }

  function parseUrlOrRegex(urlOrRegex) {
    return (urlOrRegex instanceof RegExp) ? { match: urlOrRegex.toString(), type: 'regexp' } : { match: urlOrRegex, type: 'string' }
  }
}


window.Interceptor ||= new InterceptorExtension()
`
let script = document.createElement("script");
script.defer = true;
script.id = "enableInterceptorScript";
script.type = "text/javascript";
script.textContent = code;
(document.head || document.documentElement).appendChild(script)