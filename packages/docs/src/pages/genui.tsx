import React from 'react';
import Layout from '@theme/Layout';
import { Section } from '../components/Section';
import styles from './subpages.module.css';

export default function GenUI() {
  return (
    <Layout title="Generative UI" description="Overview of Generative UI in AI.JSX.">
      <Section fullWidth left>
        <div className={styles.titles}>
          <Section.Title level={1} className={styles.header}>
            Generative UI
          </Section.Title>

          <Section.Subtitle className={styles.subheader} left>
            Bacon ipsum dolor amet chislic tri-tip hamburger lorem, chicken doner t-bone. Eu shank biltong, velit
            chicken tri-tip proident esse pork loin ball tip. Non turkey reprehenderit, eiusmod nulla consequat boudin
            short loin minim. Doner flank porchetta, jerky cillum pork beef. Dolore velit ham, consequat chicken strip
            steak biltong ut.
          </Section.Subtitle>
        </div>
      </Section>
    </Layout>
  );
}

// import clsx from "clsx"
// // import { differenceInDays, format, formatDistanceToNowStrict } from "date-fns"
// import { usePluginData } from "@docusaurus/useGlobalData"
// import React, { ReactNode, useEffect, useState } from "react"
// import Link from "@docusaurus/Link"

// import Button from "../theme/Button"
// // import CodeBlock from "@theme/CodeBlock"
// import Layout from "../theme/Layout"

// import biCss from "../css/get-questdb/binary.module.css"
// import chCss from "../css/get-questdb/changelog.module.css"
// import ctCss from "../css/get-questdb/cta.module.css"
// import ilCss from "../css/get-questdb/illustration.module.css"
// import seCss from "../css/section.module.css"
// import { getAssets, getOs, Os, Release } from "../utils/get-assets"
// import { Section } from "../components/Section"
// import { GetQuestdbHelp } from "../modules/get-questdb-help"

// import customFields from "../config/customFields"

// type BinaryProps = Readonly<{
//   architecture: boolean
//   basis: string
//   children?: ReactNode
//   detailsGrow: number
//   grow: number
//   href?: string
//   logo: ReactNode
//   rt: boolean
//   size?: string
//   title: string
// }>

// const Binary = ({
//   architecture,
//   basis,
//   children,
//   detailsGrow,
//   grow,
//   href,
//   logo,
//   rt,
//   size,
//   title,
// }: BinaryProps) => {
//   const hasDetails = Boolean(architecture || rt || size)

//   return (
//     <section className={biCss.binary}>
//       <div className={biCss.binary__expand} style={{ flexBasis: basis }} />

//       {logo}

//       <h3
//         className={clsx(biCss.binary__title, {
//           [biCss["binary__title--grow"]]: !hasDetails,
//         })}
//         style={{ flexGrow: grow }}
//       >
//         {title}
//       </h3>

//       {hasDetails && (
//         <p className={biCss.binary__details} style={{ flexGrow: detailsGrow }}>
//           {architecture && (
//             <span className={biCss.binary__architecture}>64-bit</span>
//           )}

//           <span className={biCss.binary__size}>
//             {rt && " rt -"}
//             {size != null && ` ${size}`}
//           </span>
//         </p>
//       )}

//       {href != null && (
//         <Button
//           className={biCss.binary__download}
//           href={href}
//           newTab={false}
//           variant="tertiary"
//         >
//           Download
//         </Button>
//       )}

//       {children}
//     </section>
//   )
// }

// Binary.defaultProps = {
//   architecture: false,
//   basis: "auto",
//   detailsGrow: 1,
//   grow: 0,
//   rt: false,
// }

// const GetQuestdbPage = () => {
//   const title = "Download QuestDB"
//   const description =
//     "Download QuestDB, an open source time series SQL database for fast ingestion and queries"
//   const { release } = usePluginData<{ release: Release }>(
//     "fetch-latest-release",
//   )
//   const [os, setOs] = useState<Os | undefined>()
//   const [releaseDate, setReleaseDate] = useState(
//     format(new Date(release.published_at), "MMMM M, yyyy"),
//   )
//   const assets = getAssets(release)

//   useEffect(() => {
//     const isClient = typeof window !== "undefined"

//     if (!isClient) {
//       return
//     }

//     setOs(getOs())
//   }, [])

//   useEffect(() => {
//     const isClient = typeof window !== "undefined"

//     if (!isClient) {
//       return
//     }

//     if (differenceInDays(new Date(), new Date(release.published_at)) < 31) {
//       setReleaseDate(
//         `${formatDistanceToNowStrict(new Date(release.published_at))} ago`,
//       )
//     }
//     setOs(getOs())
//   }, [release.published_at])

//   const perOs = {
//     linux: (
//       <Binary
//         architecture
//         href={assets.linux.href}
//         logo={
//           <img
//             alt="Linux Logo"
//             className={biCss.binary__logo}
//             height={49}
//             src="/img/pages/getQuestdb/linux.svg"
//             width={42}
//           />
//         }
//         rt
//         size={assets.linux.size}
//         title="Linux"
//       >
//         <p className={biCss.binary__docs}>
//           <Link to="/docs/get-started/binaries#your-operating-system-version">
//             Docs
//           </Link>
//         </p>
//       </Binary>
//     ),
//     bsd: (
//       <Binary
//         architecture
//         href={assets.bsd.href}
//         logo={
//           <img
//             alt="FreeBSD Logo"
//             className={biCss.binary__logo}
//             height={49}
//             src="/img/pages/getQuestdb/bsd.svg"
//             width={42}
//           />
//         }
//         rt
//         size={assets.bsd.size}
//         title="FreeBSD"
//       >
//         <p className={biCss.binary__docs}>
//           <Link to="/docs/get-started/binaries#your-operating-system-version">
//             Docs
//           </Link>
//         </p>
//       </Binary>
//     ),
//     macos: (
//       <Binary
//         basis="15px"
//         grow={1}
//         logo={
//           <img
//             alt="macOS Logo"
//             className={biCss.binary__logo}
//             height={49}
//             src="/img/pages/getQuestdb/macos.svg"
//             width={41}
//           />
//         }
//         title="macOS (via Homebrew)"
//       >
//         <div />

//         {/* <CodeBlock className="language-shell">
//           {`brew update
// brew install questdb`}
//         </CodeBlock> */}

//         <p className={biCss.binary__docs}>
//           <Link to="/docs/get-started/homebrew">Docs</Link>
//         </p>
//       </Binary>
//     ),
//     windows: (
//       <Binary
//         architecture
//         href={assets.windows.href}
//         logo={
//           <img
//             alt="Windows Logo"
//             className={biCss.binary__logo}
//             height={49}
//             src="/img/pages/getQuestdb/windows.svg"
//             width={49}
//           />
//         }
//         rt
//         size={assets.windows.size}
//         title="Windows"
//       >
//         <p className={biCss.binary__docs}>
//           <Link to="/docs/get-started/binaries#your-operating-system-version">
//             Docs
//           </Link>
//         </p>
//       </Binary>
//     ),
//   }

//   return (
//     <Layout canonical="/get-questdb" description={description} title={title}>
//       <Section>
//         <div className={seCss.section__header}>
//           <Section.Title level={1}>Get QuestDB</Section.Title>

//           <Section.Subtitle center>
//             Find links below to download the latest version of QuestDB{" "}
//             {release.name}
//           </Section.Subtitle>

//           <Section.Subtitle center>
//             Or check <Link to="/cloud/">QuestDB Cloud</Link> for a managed
//             solution.
//           </Section.Subtitle>

//           <img
//             alt="Screenshot of the Web Console showing various SQL statements and the result of one as a chart"
//             className={ilCss.illustration}
//             height={375}
//             src="/img/pages/getQuestdb/console.png"
//             width={500}
//           />

//           <div className={ctCss.cta}>
//             <p
//               className={clsx(ctCss.cta__details, {
//                 [ctCss["cta__details--download"]]: os !== "macos",
//               })}
//             >
//               Latest Release:&nbsp;
//               <span className={ctCss.cta__version}>{release.name}</span>
//               &nbsp;({releaseDate})
//             </p>
//             {os != null && os !== "macos" && assets[os] && (
//               <Button href={assets[os].href} newTab={false}>
//                 {os}&nbsp;Download
//               </Button>
//             )}
//           </div>

//           <div className={chCss.changelog}>
//             <a
//               className={chCss.changelog__link}
//               href={release.html_url}
//               rel="noopener noreferrer"
//               target="_blank"
//             >
//               View the changelog
//             </a>
//             <a
//               className={chCss.changelog__link}
//               href={`${customFields.githubUrl}/tags`}
//               rel="noopener noreferrer"
//               target="_blank"
//             >
//               View previous releases
//             </a>
//           </div>
//         </div>
//       </Section>

//       <div className={seCss["section--flex-wrap"]}>
//         <Binary
//           basis="40px"
//           grow={2.6}
//           logo={
//             <img
//               alt="Docker logo"
//               className={biCss.binary__logo}
//               height={49}
//               src="/img/pages/getQuestdb/docker.svg"
//               width={69}
//             />
//           }
//           title="Docker"
//         >
//           {/* <CodeBlock className="language-shell">
//             docker run -p 9000:9000 questdb/questdb
//           </CodeBlock> */}
//           <p className={biCss.binary__docs}>
//             <Link to="/docs/get-started/docker">Docs</Link>
//           </p>
//         </Binary>
//         <Binary
//           grow={0.6}
//           logo={
//             <img
//               alt="Helm logo"
//               className={biCss.binary__logo}
//               height={49}
//               src="/img/pages/getQuestdb/helm.svg"
//               width={50}
//             />
//           }
//           title="Kubernetes (via Helm)"
//         >
//           {/* <CodeBlock className="language-shell">
//             {`helm repo add questdb https://helm.${customFields.domain}/
// helm install my-questdb questdb/questdb`}
//           </CodeBlock> */}
//           <p className={biCss.binary__docs}>
//             <a
//               href={customFields.artifactHubUrl}
//               rel="noopener noreferrer"
//               target="_blank"
//             >
//               Docs
//             </a>
//           </p>
//         </Binary>
//         {os != null ? (
//           <>
//             {perOs[os]}
//             {os !== "linux" && perOs.linux}
//             {os !== "bsd" && perOs.bsd}
//             {os !== "macos" && perOs.macos}
//             {os !== "windows" && perOs.windows}
//           </>
//         ) : (
//           <>
//             {perOs.linux}
//             {perOs.bsd}
//             {perOs.macos}
//             {perOs.windows}
//           </>
//         )}
//         <Binary
//           architecture
//           detailsGrow={3.5}
//           href={assets.noJre.href}
//           logo={
//             <img
//               alt="Planet with wings"
//               className={biCss.binary__logo}
//               height={49}
//               src="/img/pages/getQuestdb/nojre.svg"
//               width={75}
//             />
//           }
//           size={assets.noJre.size}
//           title="Any (no JVM)"
//         >
//           <p className={biCss.binary__docs}>
//             <Link to="/docs/get-started/binaries/#download-the-binaries">
//               Docs
//             </Link>
//           </p>
//         </Binary>
//         <Binary
//           grow={0.5}
//           logo={
//             <img
//               alt="Maven logo"
//               className={biCss.binary__logo}
//               height={49}
//               src="/img/pages/getQuestdb/maven.svg"
//               width={37}
//             />
//           }
//           title="Maven"
//         >
//           {/* <CodeBlock className="language-xml">
//             {`<dependency>
//   <groupId>org.questdb</groupId>
//   <artifactId>questdb</artifactId>
//   <version>${release.name}</version>
// </dependency>`}
//           </CodeBlock> */}
//           <p className={biCss.binary__docs}>
//             <Link to="/docs/reference/api/java-embedded">Docs</Link>
//           </p>
//         </Binary>
//         <Binary
//           grow={2}
//           logo={
//             <img
//               alt="Gradle logo"
//               className={biCss.binary__logo}
//               height={48}
//               src="/img/pages/getQuestdb/gradle.svg"
//               width={67}
//             />
//           }
//           title="Gradle"
//         >
//           {/* <CodeBlock className="language-shell">
//             {`implementation 'org.questdb:questdb:${release.name}'`}
//           </CodeBlock> */}
//           <div style={{ height: "2.75rem" }} />
//           <p className={biCss.binary__docs}>
//             <Link to="/docs/reference/api/java-embedded">Docs</Link>
//           </p>
//         </Binary>
//       </div>

//       <GetQuestdbHelp assets={assets} release={release} />
//     </Layout>
//   )
// }

// export default GetQuestdbPage
