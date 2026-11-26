// The size every inventory item face sits in: a card is wide, a book is tall.
export type Shape = "card" | "book" | "cheque" | "phone" | "square";

export const SHAPE_CLASS: Record<Shape, string> = {
  card: "aspect-[1.586] w-full max-w-[320px]",
  book: "aspect-[0.72] w-full max-w-[220px]",
  cheque: "aspect-[2.3] w-full max-w-[360px]",
  phone: "aspect-[0.5] w-full max-w-[150px]",
  square: "aspect-square w-full max-w-[230px]",
};


/**
 * A tile shows the item as a true miniature: drawn at its full size and
 * scaled down, so the text on it scales with it instead of crowding.
 */
export const THUMB: Record<Shape, { width: number; scale: number }> = {
  card: { width: 300, scale: 0.3 },
  book: { width: 200, scale: 0.26 },
  cheque: { width: 340, scale: 0.27 },
  phone: { width: 140, scale: 0.26 },
  square: { width: 220, scale: 0.33 },
};
