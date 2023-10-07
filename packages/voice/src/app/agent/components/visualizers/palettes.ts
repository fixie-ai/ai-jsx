import { Color } from "three";
import { Lut } from "three/examples/jsm/math/Lut";

/**
 * Describes a color palette type
 */
export const COLOR_PALETTE = {
  THREE_RAINBOW: "rainbow",
  THREE_COOL_TO_WARM: "cooltowarm",
  WARM: "Warm",
  WARM_2: "Warm_2",
  WARM_3: "Warm_3",
  SAND: "Sand",
  SAND_2: "Sand_2",
  SAND_3: "Sand_3",
  SAND_4: "Sand_4",
  SAND_5: "Sand_5",
  NATURAL: "Natural",
  NATURAL_2: "Natural_2",
  CIRCUS: "Circus",
  CIRCUS_2: "Circus_2",
  SEASIDE: "Seaside",
  DRAGON: "Dragon",
} as const;

type ObjectValues<T> = T[keyof T];
export type ColorPaletteType = ObjectValues<typeof COLOR_PALETTE>;

export const AVAILABLE_COLOR_PALETTES = [
  COLOR_PALETTE.THREE_COOL_TO_WARM,
  COLOR_PALETTE.THREE_RAINBOW,
  COLOR_PALETTE.WARM,
  COLOR_PALETTE.WARM_2,
  COLOR_PALETTE.WARM_3,
  COLOR_PALETTE.SAND,
  COLOR_PALETTE.SAND_2,
  COLOR_PALETTE.SAND_3,
  COLOR_PALETTE.SAND_4,
  COLOR_PALETTE.SAND_5,
  COLOR_PALETTE.NATURAL,
  COLOR_PALETTE.NATURAL_2,
  COLOR_PALETTE.CIRCUS,
  COLOR_PALETTE.CIRCUS_2,
  COLOR_PALETTE.SEASIDE,
  COLOR_PALETTE.DRAGON,
];

export interface IGradient {
  getAt: (t: number) => Color;
}

const mix = (x: number, y: number, a: number) => {
  if (a <= 0) {
    return x;
  }
  if (a >= 1) {
    return y;
  }
  return x + a * (y - x);
};

export class GradientLinear implements IGradient {
  private colors: Color[];
  constructor(palette: IColorPalette) {
    this.colors = palette.colors.map((c) => new Color(c));
  }

  public getAt = (t: number) => {
    t = Math.min(1, Math.max(0, t));
    const from = Math.floor(t * this.colors.length * 0.9999);
    const to = Math.min(this.colors.length - 1, Math.max(0, from + 1));
    const fc = this.colors[from];
    const ft = this.colors[to];
    const p = (t - from / this.colors.length) / (1 / this.colors.length);
    const res = new Color();
    res.r = mix(fc.r, ft.r, p);
    res.g = mix(fc.g, ft.g, p);
    res.b = mix(fc.b, ft.b, p);
    return res;
  };
}

export interface IColorPalette {
  name: string;
  colors: string[];
  nColors: number;
}

export class ColorPalette implements IColorPalette {
  public readonly name: string;
  public readonly colors: string[];
  public get colorsHex() {
    return this.colors.map((s) => new Color(s).getHex());
  }
  public get nColors() {
    return this.colors.length;
  }

  constructor(name: string, colors: string[]) {
    this.name = name;
    if (colors.length < 2) {
      throw new Error("Not enough colors");
    }
    this.colors = [...colors];
  }

  public buildLut = () => {
    const lut = new Lut();
    lut.addColorMap(
      this.name,
      this.colorsHex.map((hex, i) => [i / (this.nColors - 1), hex])
    );
    lut.setColorMap(this.name);
    return lut;
  };

  public calcBackgroundColor = (norm: number = 0.5) => {
    const gradient = new GradientLinear(this);
    const bkg = gradient.getAt(norm);
    const tmp = { h: 0, s: 0, l: 0 };
    bkg.getHSL(tmp);
    tmp.s = Math.min(tmp.s, 0.5);
    bkg.setHSL(tmp.h, tmp.s, tmp.l);
    return bkg;
  };

  public static getPalette(type: ColorPaletteType) {
    /**
     * Wonderful color combos taken from https://github.com/spite/genuary-2022
     */
    switch (type) {
      case COLOR_PALETTE.WARM:
        return new ColorPalette(COLOR_PALETTE.WARM, [
          "#FF2000",
          "#FF5900",
          "#FE9100",
          "#FEFDFC",
          "#FEC194",
          "#FE9F5B",
        ]);
      case COLOR_PALETTE.WARM_2:
        return new ColorPalette("Warm_2", [
          "#FFFEFE",
          "#0D0211",
          "#FBCEA0",
          "#FFAD5D",
          "#530E1D",
          "#FE9232",
          "#B93810",
          "#907996",
        ]);
      case COLOR_PALETTE.WARM_3:
        return new ColorPalette(COLOR_PALETTE.WARM_3, [
          "#EDEBE7",
          "#13595A",
          "#DE1408",
          "#161814",
          "#E1610A",
          "#B7BDB3",
          "#9F9772",
        ]);
      case COLOR_PALETTE.SAND:
        return new ColorPalette(COLOR_PALETTE.SAND, [
          "#b8987a",
          "#caa87f",
          "#dfb98a",
          "#ebc99c",
          "#f3ddb0",
          "#f9e6c1",
          "#fff3d7",
        ]);
      case COLOR_PALETTE.SAND_2:
        return new ColorPalette(COLOR_PALETTE.SAND_2, [
          "#f2ead6",
          "#327172",
          "#2d3e58",
          "#f47e72",
          "#f2cab1",
        ]);
      case COLOR_PALETTE.SAND_3:
        return new ColorPalette(COLOR_PALETTE.SAND_3, [
          "#f1e2c3",
          "#8595a4",
          "#8d4f2a",
          "#d86b28",
          "#eca956",
        ]);
      case COLOR_PALETTE.SAND_4:
        return new ColorPalette(COLOR_PALETTE.SAND_4, [
          "#242112",
          "#684f27",
          "#9a733a",
          "#ac8f56",
          "#e5a752",
          "#fdbe6e",
          "#ffd28f",
        ]);
      case COLOR_PALETTE.SAND_5:
        return new ColorPalette(COLOR_PALETTE.SAND_5, [
          "#44200a",
          "#75380c",
          "#9e5922",
          "#b96525",
          "#da863d",
          "#f5ad63",
          "#fec37d",
        ]);
      case COLOR_PALETTE.NATURAL:
        return new ColorPalette(COLOR_PALETTE.NATURAL, [
          "#FF6D00",
          "#FBF8EB",
          "#008B99",
          "#F8E1A6",
          "#FDA81F",
          "#B80A01",
          "#480D07",
        ]);
      case COLOR_PALETTE.NATURAL_2:
        return new ColorPalette(COLOR_PALETTE.NATURAL_2, [
          "#EF2006",
          "#350000",
          "#A11104",
          "#ED5910",
          "#F1B52E",
          "#7B5614",
          "#F7F1AC",
        ]);
      case COLOR_PALETTE.CIRCUS:
        return new ColorPalette(COLOR_PALETTE.CIRCUS, [
          "#F62D62",
          "#FFFFFF",
          "#FDB600",
          "#F42D2D",
          "#544C98",
          "#ECACBC",
        ]);
      case COLOR_PALETTE.CIRCUS_2:
        return new ColorPalette(COLOR_PALETTE.CIRCUS_2, [
          "#F62D62",
          "#FFFFFF",
          "#FDB600",
          "#F42D2D",
          "#544C98",
          "#ECACBC",
        ]);
      case COLOR_PALETTE.SEASIDE:
        return new ColorPalette(COLOR_PALETTE.SEASIDE, [
          "#FEB019",
          "#F46002",
          "#E1E7F1",
          "#0A1D69",
          "#138FE2",
          "#0652C4",
          "#D23401",
          "#B0A12F",
        ]);
      case COLOR_PALETTE.DRAGON:
        return new ColorPalette(COLOR_PALETTE.DRAGON, [
          "#F2E9D9",
          "#101010",
          "#EA4B04",
          "#B6AC9E",
          "#5A5754",
          "#837F7A",
          "#E78E36",
          "#552509",
        ]);
      case COLOR_PALETTE.THREE_RAINBOW:
        return new ColorPalette(COLOR_PALETTE.THREE_RAINBOW, [
          "#0000FF",
          "#00FFFF",
          "#00FF00",
          "#FFFF00",
          "#FF0000",
        ]);
      case COLOR_PALETTE.THREE_COOL_TO_WARM:
        return new ColorPalette(COLOR_PALETTE.THREE_COOL_TO_WARM, [
          "#3c4ec2",
          "#9bbcff",
          "#dcdcdc",
          "#f6a385",
          "#b40426",
        ]);
      default:
        throw new Error(`Unsupported color palette: ${type}`);
    }
  }
  public static random(
    options: ColorPaletteType[] = AVAILABLE_COLOR_PALETTES
  ): ColorPalette {
    return ColorPalette.getPalette(
      options[Math.floor(Math.random() * options.length)]
    );
  }
}
