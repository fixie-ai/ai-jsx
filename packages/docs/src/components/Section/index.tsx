import React from "react"
import style from "./styles.module.css"
import clsx from "clsx"

import { Title } from "./Title"
import { Subtitle } from "./Subtitle"

type Props = {
  children: React.ReactNode
  odd?: boolean
  accent?: boolean
  row?: boolean
  fullWidth?: boolean
  noGap?: boolean
  center?: boolean
  className?: string
  id?: string
}

export const Section = ({
  fullWidth,
  children,
  odd,
  accent,
  row,
  noGap,
  center,
  className = "",
  id,
}: Props) => (
  <div
    className={clsx(
      style.root,
      {
        [style.odd]: odd,
        [style.accent]: accent,
        [style.row]: row,
        [style.fullWidth]: fullWidth,
        [style.noGap]: noGap,
        [style.center]: center,
      },
      className,
    )}
    id={id}
  >
    {children}
  </div>
)

Section.Title = Title
Section.Subtitle = Subtitle
