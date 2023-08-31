import React from "react"
import style from "./styles.module.css"
import clsx from "clsx"

export const Title = ({
  level = 2,
  children,
  center,
  size = "medium",
  className,
}: {
  level?: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
  center?: boolean
  size?: "small" | "medium"
  className?: string
}) =>
  React.createElement(
    `h${level}`,
    {
      className: clsx(
        style.root,
        { [style.center]: center },
        style[`size-${size}`],
        className,
      ),
    },
    children,
  )
