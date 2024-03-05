const config = {
   message: {
        disabled: false,
        slot: 'top-center',
        duration: 0,
        klass: 'message',
        converter: (payload, sender) => {
            return payload
        }
    }
}

export { config } // Don't remove this line.