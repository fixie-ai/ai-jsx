import React, { ReactNode } from "react"
import Head from "@docusaurus/Head"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import useBaseUrl from "@docusaurus/useBaseUrl"

import AnnouncementBar from "@theme/AnnouncementBar"
import Footer from "@theme/Footer"
import LayoutProviders from "@theme/LayoutProviders"
import Navbar from "@theme/Navbar"
import { MetadataContextProvider } from "@theme/useMetadataContext"
import { ensureTrailingSlash } from "../../utils"

export type Props = {
  canonical?: string
  replaceTitle?: boolean
  children: ReactNode
  title?: string
  description?: string
  image?: string
  keywords?: string | string[]
  permalink?: string
  wrapperClassName?: string
  searchMetadatas?: {
    version?: string
    tag?: string
  }
}

const Layout = ({
  canonical,
  children,
  description,
  image,
  keywords,
  permalink,
  title,
  replaceTitle = false,
  wrapperClassName,
}: Props) => {
  const { siteConfig } = useDocusaurusContext()
  const {
    title: siteTitle,
    themeConfig: { image: defaultImage },
    url: siteUrl,
  } = siteConfig

  const metaTitle = replaceTitle
    ? title
    : title != null
    ? `${title} | ${siteTitle}`
    : siteTitle

  const metaImage = image ?? defaultImage
  const metaImageUrl = useBaseUrl(metaImage, { absolute: true })
  const isBlogPost =
    description?.match(/^Blog/g) == null && wrapperClassName === "blog-wrapper"

  return (
    <MetadataContextProvider value={{ isBlogPost }}>
      <LayoutProviders>
        <Head>
          <title>{metaTitle}</title>
          {permalink != null && (
            <link
              rel="canonical"
              href={`${siteUrl}${ensureTrailingSlash(permalink)}`}
            />
          )}
          {permalink == null && canonical != null && (
            <link
              rel="canonical"
              href={`${siteUrl}${ensureTrailingSlash(canonical)}`}
            />
          )}
          <meta property="og:image" content={metaImageUrl} />
          {permalink != null && (
            <meta
              property="og:url"
              content={`${siteUrl}${ensureTrailingSlash(permalink)}`}
            />
          )}
          {permalink == null && canonical != null && (
            <meta
              property="og:url"
              content={`${siteUrl}${ensureTrailingSlash(canonical)}`}
            />
          )}
          <meta property="og:title" content={metaTitle} />
          <meta name="twitter:image" content={metaImageUrl} />
          {description != null && (
            <meta name="description" content={description} />
          )}
          {description != null && (
            <meta name="twitter:description" content={description} />
          )}
          {description != null && (
            <meta property="og:description" content={description} />
          )}
          <meta name="twitter:title" content={metaTitle} />
          <meta
            name="twitter:image:alt"
            content={`Image for "${String(metaTitle)}"`}
          />
          {keywords != null && keywords.length > 0 && (
            <meta
              name="keywords"
              content={
                keywords instanceof Array ? keywords.join(",") : keywords
              }
            />
          )}
        </Head>
        <AnnouncementBar />
        <Navbar />
        <div className={wrapperClassName}>{children}</div>
        <Footer />
      </LayoutProviders>
    </MetadataContextProvider>
  )
}

export default Layout
