import {
  Coffee,
  CookingPot,
  Cookie,
  Croissant,
  CupSoda,
  IceCreamBowl,
  Package,
  Sandwich,
  ShoppingBasket,
  UtensilsCrossed,
} from "lucide-react";
import type { ApiProductIcon } from "@/lib/api";

export const PRODUCT_ICON_OPTIONS: {
  value: ApiProductIcon;
  label: string;
  Icon: typeof Package;
  color: string;
}[] = [
  { value: "GENERAL", label: "Geral", Icon: Package, color: "text-primary bg-primary/10" },
  {
    value: "SANDWICH",
    label: "Hambúrguer / misto",
    Icon: Sandwich,
    color: "text-amber-700 bg-amber-100",
  },
  { value: "DRINK", label: "Água / refri / suco", Icon: CupSoda, color: "text-sky-700 bg-sky-100" },
  {
    value: "DESSERT",
    label: "Docinho / sobremesa",
    Icon: Cookie,
    color: "text-pink-700 bg-pink-100",
  },
  {
    value: "SNACK",
    label: "Tapioca / salgado",
    Icon: CookingPot,
    color: "text-orange-700 bg-orange-100",
  },
  {
    value: "COMBO",
    label: "Combo",
    Icon: ShoppingBasket,
    color: "text-emerald-700 bg-emerald-100",
  },
  {
    value: "MEAL",
    label: "Refeição / espetinho",
    Icon: UtensilsCrossed,
    color: "text-red-700 bg-red-100",
  },
  {
    value: "BAKERY",
    label: "Pão / bolo / torta",
    Icon: Croissant,
    color: "text-yellow-800 bg-yellow-100",
  },
  {
    value: "FROZEN_DESSERT",
    label: "Açaí / dindin",
    Icon: IceCreamBowl,
    color: "text-purple-700 bg-purple-100",
  },
  {
    value: "HOT_DRINK",
    label: "Café / chocolate quente",
    Icon: Coffee,
    color: "text-stone-700 bg-stone-100",
  },
];
