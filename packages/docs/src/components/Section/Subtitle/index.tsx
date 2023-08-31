import React from "react"
import style from "./styles.module.css"
import clsx from "clsx"

type Props = {
  children: React.ReactNode
  center?: boolean
  size?: "small" | "medium"
  className?: string
  style?: React.CSSProperties
}

export const Subtitle = ({
  children,
  center,
  size = "medium",
  className = "",
  style: styleProp,
}: Props) => (
  <p
    className={clsx(
      style.root,
      { [style.center]: center },
      style[`size-${size}`],
      className,
    )}
    style={styleProp}
  >
    {children}
  </p>
)
