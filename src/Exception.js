class CapSolverPluginException extends Error {
    constructor(
        message,
        error
    ) {
        super(message); 
        this.id = error.id ?? null;
        this.description = error.description ?? null;
    }
}

module.exports = { CapSolverPluginException };