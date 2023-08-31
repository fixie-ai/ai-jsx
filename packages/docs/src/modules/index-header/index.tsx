import React from "react"
import Link from "@docusaurus/Link"
import { Section } from "../../components/Section"
import styles from "./styles.module.css"

export const Header = () => {

  return (
    <Section>
      <div className={styles.titles}>
        <Section.Title level={1} className={styles.header}>
          Conversational AI Apps.
          <br />
          Built in React.
        </Section.Title>

        <Section.Subtitle className={styles.subheader} left>
        AI.JSX is a framework for building AI applications using Javascript and JSX. 
        You get great support for prompt engineering, Document Question + Answering, 
        and using external Tools (APIs). You can provide a set of React components to 
        the LLM and have your UI constructed dynamically at runtime (AKA GenUI). Bring 
        all these to life in a Sidekick or use them as building blocks in other apps.
        </Section.Subtitle>
      </div>
    </Section>
  )
}
