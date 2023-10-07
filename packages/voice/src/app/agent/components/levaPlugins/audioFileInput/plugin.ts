import { AudioFileInput } from './types'

export const sanitize = (v: any): File | undefined => {
  if (v === undefined) return undefined
  if (v instanceof File) {
    try {
      return v;
      // return URL.createObjectURL(v)
    } catch (e) {
      return undefined
    }
  }
  throw Error(`Invalid file format [undefined | blob | File].`)
}

export const schema = (_o: any, s: any) => s instanceof File || typeof s === "string";

export const normalize = ({ file }: AudioFileInput) => {
  return { value: file }
}