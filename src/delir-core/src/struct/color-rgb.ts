export interface ColorRgbJSON {
    red: number
    green: number
    blue: number
}

export default class ColorRGB {
    _red: number
    _green: number
    _blue: number

    constructor(
        r: number = 0,
        g: number = 0,
        b: number = 0,
    ) {
        this._red    = r
        this._green  = g
        this._blue   = b
    }

    get r(): number { return this._red }
    get g(): number { return this._green }
    get b(): number { return this._blue }

    clone(
        r: number|null = null,
        g: number|null = null,
        b: number|null = null,
    ): ColorRGB
    {
        return new ColorRGB(
            r || this.r,
            g || this.g,
            b || this.b,
        )
    }

    toJSON()
    {
        return {
            red: this.r,
            green: this.g,
            blue: this.b,
        }
    }

    toString()
    {
        const r = ("0" + (this.r).toString(16)).slice(-2)
        const g = ("0" + (this.g).toString(16)).slice(-2)
        const b = ("0" + (this.b).toString(16)).slice(-2)
        return `#${r}${g}${b}`
    }
}
