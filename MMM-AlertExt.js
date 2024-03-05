Module.register('MMM-AlertExt', {
  defaults: {
    iconifyURL: 'https://code.iconify.design/iconify-icon/1.0.8/iconify-icon.min.js',
    template: './template.html',
    useIconify: true,
    defaultMaxStack: 10,
    slotMaxStack: {
      'top-center': 1,
      'bottom-center': 5,
    },
    modularConfig: null, // './config/config.mjs',
    message: {
      disabled: false,
      slot: 'bottom-right',
      duration: 10000,
      klass: 'message',
      converter: (payload, sender) => payload,
    },
    alert: {
      disabled: false,
      slot: 'popover',
      duration: 30000,
      klass: 'alert',
      icon: 'fa-solid fa-bell',
      converter: (payload, sender) => {
        const messageBody = document.createElement('div')
        if (payload.imageUrl) {
          const image = document.createElement('img')
          image.src = payload.imageUrl
          if (payload.imageHeight) image.style.height = payload.imageHeight
          messageBody.appendChild(image)
        }
        if (payload.message) {
          const message = document.createElement('div')
          message.innerHTML = payload.message
          messageBody.appendChild(message)
        }
        return {
          title: payload.title,
          message: messageBody.innerHTML,
          duration: payload.timer,
          klass: payload?.klass ?? 'alert',
        }
      },
    },
    alertNotification: {
      disabled: false,
      slot: 'top-right',
      duration: 10000,
      klass: 'alertNotification',
      icon: 'fa-bell',
      converter: (payload, sender) => {
        return {
          title: payload.title,
          message: payload.message,
          duration: payload.timer,
        }
      },
    },
    log: {
      disabled: true,
      slot: 'bottom-left',
      duration: 10000,
      converter: (method, context, location) => {
        const icons = {
          log: '&#x1F4AC',
          info: '&#x2139',
          warn: '&#x26A0',
          error: '&#x2297',
          debug: '&#x2299',
        }
        return {
          title: location,
          message: context.join('<br/>'),
          klass: method.toLowerCase(),
          icon: icons?.[ method.toLowerCase() ] ?? '',
        }
      },
    },
    notification: {
      disabled: true,
      slot: 'top-right',
      duration: 10000,
      klass: 'notification',
      converter: (notification, payload, sender) => {
        return {
          message: sender?.name ?? 'MAGICMIRROR',
          title: notification,
        }
      },
    },
    exception: {
      disabled: true,
      slot: 'bottom-center',
      duration: 30000,
      icon: 'fa fa-bug',
      converter: (exception, location, message) => {
        return {
          title: exception,
          message,
          klass: 'exception',
        }
      },
    },
  },

  getStyles: function () {
    return [ 'MMM-AlertExt.css' ]
  },

  start: async function () {
    await this.prepareConfig()
    await this.prepareIconify()
    await this.prepareBoard()
    await this.prepareElement()
    if (!this.config.log.disabled) await this.prepareLog()
    if (!this.config.exception.disabled) await this.prepareException()
  },

  prepareConfig: async function () {
    let m = {}
    if (this.config.modularConfig) {
      try {
        const c = await import('/' + this.file(this.config.modularConfig))
        m = c.config
      } catch (e) {
        console.error('[AX] Failed to load modular config', e)
      }
    }
    this.config = { ...this.defaults, ...this.config, ...m }
    this.config.log = { ...this.defaults.log, ...this.config.log }
    this.config.alert = { ...this.defaults.alert, ...this.config.alert }
    this.config.alertNotification = { ...this.defaults.alertNotification, ...this.config.alertNotification }
    this.config.exception = { ...this.defaults.exception, ...this.config.exception }
    this.config.message = { ...this.defaults.message, ...this.config.message }
    this.config.notification = { ...this.defaults.notification, ...this.config.notification }
    const slots = [ 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center' ]
    this.config.slotMaxStack = slots.reduce((acc, slot) => {
      acc[ slot ] = (this.config.slotMaxStack[ slot ]) ? this.config.slotMaxStack[ slot ] : this.config.defaultMaxStack
      return acc
    }, {})
  },

  prepareException: async function () {
    const message = (...args) => this.message(...args)
    const converter = (...args) => this.config.exception.converter(...args)
    window.addEventListener('error', (msg, url, lineNo, columnNo, error) => {
      const location = `${url.split('/').at(-1)}:${lineNo}:${columnNo}`
      const context = [  ]
      message(converter('System Error', location, msg, error), 'exception')
    })

    window.addEventListener('unhandledrejection', (event) => {
      const stack = event.reason.stack.split('\n')
      const msg = stack[ 0 ].trim()
      const location = stack[ 1 ].trim().split('/').at(-1).replaceAll(')', '')
      message(converter('Unhandled Rejection', location, msg, event), 'exception')
    })
  },

  prepareLog: async function () {
    const logLevel = config.logLevel
    const message = (...args) => this.message(...args)
    const converter = (...args) => this.config.log.converter(...args)
    Log = new Proxy(Log, {
      get: (target, prop, receiver) => {
        if (!(prop in target)) return target[ prop ]
        return (...args) => {
          const stack = new Error().stack.split('\n').slice(2)
          const location = stack[ 0 ].trim().split('/').at(-1).replaceAll(')', '')
          const context = [ ...args ]
          message(converter(prop, context, location), 'log')
          return target[ prop ](...args, '@', location)
        }
      }
    })
    Log.log("MMM-AlertExt hooks original Log from now on.")
  },

  prepareIconify: async function () {
    if (!this.config.useIconify) return
    if (!window.customElements.get('iconify-icon') && !document.getElementById('iconify')) {
      let iconify = document.createElement('script')
      iconify.id = 'iconify'
      iconify.src = this.config.iconifyURL
      document.head.appendChild(iconify)
    }
  },

  prepareBoard: async function () {
    const wrapper = document.createElement('div')
    wrapper.id = 'ax'
    const slotTopLeft = document.createElement('div')
    slotTopLeft.id = 'ax-slot-top-left'
    slotTopLeft.classList.add('ax-slot', 'corner', 'top', 'left')
    const slotTopRight = document.createElement('div')
    slotTopRight.id = 'ax-slot-top-right'
    slotTopRight.classList.add('ax-slot', 'corner', 'top', 'right')
    const slotBottomLeft = document.createElement('div')
    slotBottomLeft.id = 'ax-slot-bottom-left'
    slotBottomLeft.classList.add('ax-slot', 'corner', 'bottom', 'left')
    const slotBottomRight = document.createElement('div')
    slotBottomRight.id = 'ax-slot-bottom-right'
    slotBottomRight.classList.add('ax-slot', 'corner', 'bottom', 'right')
    const slotTopCenter = document.createElement('div')
    slotTopCenter.id = 'ax-slot-top-center'
    slotTopCenter.classList.add('ax-slot', 'center', 'top')
    const slotBottomCenter = document.createElement('div')
    slotBottomCenter.id = 'ax-slot-bottom-center'
    slotBottomCenter.classList.add('ax-slot', 'center', 'bottom')

    wrapper.appendChild(slotTopLeft)
    wrapper.appendChild(slotTopRight)
    wrapper.appendChild(slotBottomLeft)
    wrapper.appendChild(slotBottomRight)
    wrapper.appendChild(slotTopCenter)
    wrapper.appendChild(slotBottomCenter)

    document.body.appendChild(wrapper)
  },

  prepareElement: async function () {
    const template = await this.prepareTemplate()
    const config = this.config
    customElements.define(
      'ax-message',
      class extends HTMLElement {
        #timer = null
        #active = false
        #callback = async () => { }
        constructor() {
          super()
          this.attachShadow({ mode: 'open' })
          this.shadowRoot.appendChild(template.content.cloneNode(true))
        }

        getDuration() {
          return this.getAttribute('duration') ?? config.default.duration
        }

        applyDuration() {
          if (!this.#active) return
          const duration = this.getAttribute('duration') ?? config.default.duration
          clearTimeout(this.#timer)
          if (duration > 0) {
            this.#timer = setTimeout(() => {
              this.die()
            }, duration)
          }
        }

        setDuration(ms) {
          if (isNaN(ms)) return
          this.setAttribute('duration', ms)
          this.applyDuration()
        }

        setTitle(title) {
          let slotted = this.shadowRoot.querySelector('slot[name="title"]').assignedNodes()[0]
          if (!slotted) {
            slotted = document.createElement('div')
            slotted.slot = 'title'
            this.appendChild(slotted)
          }
          slotted.innerHTML = title
        }

        setMessage(message) {
          let slotted = this.shadowRoot.querySelector('slot[name="message"]').assignedNodes()[ 0 ]
          if (!slotted) {
            slotted = document.createElement('div')
            slotted.slot = 'message'
            this.appendChild(slotted)
          }
          slotted.innerHTML = message
        }

        setIcon(icon, { useIconify = true } = {}) {
          if (!icon) return
          let slotted = this.shadowRoot.querySelector('slot[name="icon"]').assignedNodes()[ 0 ]
          if (!slotted) {
            slotted = document.createElement('div')
            slotted.slot = 'icon'
            this.appendChild(slotted)
          }
          const iconifyPattern = /^\S+:\S+$/
          const iconify = icon.match(iconifyPattern)?.[ 0 ]
          const faPattern = /fa[srlb]?-/
          const fa = icon.match(faPattern)?.[ 0 ]
          if (useIconify && iconify) {
            const iconifyDom = document.createElement('iconify-icon')
            iconifyDom.icon = iconify
            iconifyDom.inline = true
            slotted.innerHTML = iconifyDom.outerHTML
          } else if (fa) {
            slotted.innerHTML = `<span class="${icon}"></span>`
          } else {
            slotted.innerHTML = icon
          }
        }

        setKlass(klassList) {
          if (!Array.isArray(klassList)) klassList = [ klassList ]
          const classes = Array.from(this.classList)
          classes.forEach((klass) => {
            this.classList.remove(klass)
          })
          klassList.forEach((klass) => {
            this.classList.add(klass)
          })
        }

        die() {
          const axMessage = this.shadowRoot.querySelector('.ax-message')
          axMessage.classList.add('ax-message-die')
          axMessage.onanimationend = async (event) => {
            await this.#callback('DIED', this.id)
            this.#callback = null
            this.parentNode.removeChild(this)
          }
        }

        setCallback(callback) {
          if (typeof callback !== 'function') return
          this.#callback = async (event, id) => {
            await callback(event, id, this)
          }
        }

        connectedCallback() {
          this.#active = true
          this.#callback('CONNECTED', this.id)
          this.applyDuration()
        }

        disconnectedCallback() {
          this.#active = false
          clearTimeout(this.#timer)
        }

        attributeChangedCallback(name, oldValue, newValue) {
          if (name === 'duration') {
            console.log(name, oldValue, newValue)
            this.applyDuration()
          }
        }
      }
    )
    Log.log('[AX] Element prepared')
  },

  prepareTemplate: async function () {
    const response = await fetch(this.file(this.config.template))
    const text = await response.text()
    const template = document.createElement('template')
    template.innerHTML = text
    return template
  },

  notificationReceived: function (notification, payload, sender) {
    if (notification === 'AX_MESSAGE') {
      let converter = (typeof this.config.message.converter === 'function')
        ? this.config.message.converter
        : this.defaults.message.converter
      if (this.config.message.disabled) return
      this.message(converter(payload, sender), 'message')
      return
    }

    if (notification === 'SHOW_ALERT' && payload.type === 'notification') {
      if (this.config.alertNotification.disabled) return
      let converter = (typeof this.config.alertNotification.converter === 'function')
        ? this.config.alertNotification.converter
        : this.defaults.alertNotification.converter
      return this.message(converter(payload, sender), 'alertNotification')
    }

    if (notification === 'SHOW_ALERT') {
      if (this.config.alert.disabled) return
      let converter = (typeof this.config.alert.converter === 'function')
        ? this.config.alert.converter
        : this.defaults.alert.converter
      return this.message(converter(payload, sender), 'alert')
    }

    if (this.config.notification.disabled) return
    let converter = (typeof this.config.notification.converter === 'function')
      ? this.config.notification.converter
      : this.defaults.notification.converter
    return this.message(converter(notification, payload, sender), 'notification')
  },

  message: function (payload, type = 'message') {
    if (!payload) return false
    let { id, title, message, klass, duration, slot, icon, callback, kill } = payload
    id = id ?? 'ax-message-instance-' + Date.now() + Math.random().toString(36).substr(2, 9)
    const already = document.getElementById(id)
    if (already) {
      already.die()
    }
    if (kill) return
    title = title ?? ''
    klass = klass ?? (this.config?.[ type ]?.klass ?? 'message')
    duration = duration ?? (this.config?.[type]?.duration ?? 10000)
    slot = slot ?? (this.config?.[ type ]?.slot ?? 'bottom-right')
    icon = icon ?? (this.config?.[ type ]?.icon ?? '')
    callback = callback ?? (() => {  })
    const m = document.createElement('ax-message')
    m.id = id
    m.setCallback(callback)
    m.setTitle(title)
    m.setMessage(message)
    m.setIcon(icon)
    m.setDuration(duration)
    m.classList.add(klass)

    if (slot === 'popover') {
      this.showPopover(m)
      return
    }

    const container = document.getElementById('ax-slot-' + slot)
    if (container) {
      const maxStack = this.config.slotMaxStack?.[ slot ] ?? this.config.defaultMaxStack
      const stacks = Array.from(container.querySelectorAll('ax-message'))
      while (stacks.length >= maxStack){
        const m = stacks.shift()
        m.die()
      }
      container.appendChild(m)
    } else {
      console.error('[AX] Invalid slot', slot)
    }
  },

  showPopover: function (axMessage) {
    const opened = document.querySelectorAll('[popover-opened]')
    opened.forEach((popover) => {
      o.hidePopover()
    })

    axMessage.popover = 'auto'
    axMessage.classList.add('popover')
    document.body.appendChild(axMessage)
    axMessage.showPopover()
    const life = axMessage.getDuration()
    if (life > 0) {
      axMessage.setAttribute('duration', 0)
      setTimeout(() => {
        axMessage.ontransitionend = (event) => {
          axMessage.die()
        }
        axMessage.hidePopover()
      }, life)
    }
  },
})
