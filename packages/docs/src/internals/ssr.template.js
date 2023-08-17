module.exports = ({ customFields, favicon, organizationName, url }) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0" />
    <meta httpEquiv="x-ua-compatible" content="ie=edge" />
    <meta property="og:type" content="website" />
    <meta name="author" content="${organizationName}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@questdb" />
    <meta name="generator" content="Docusaurus v<%= it.version %>" />
    <link href="https://www.googletagmanager.com" rel="dns-prefetch" />
    <link href="https://www.google-analytics.com" rel="dns-prefetch" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/img/icons/apple-180x180.png" sizes="180x180" />
    <meta name="msapplication-config" content="/browserconfig.xml" />
    <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
    <%~ it.headTags %>
    <% it.metaAttributes.forEach((metaAttribute) => { %>
      <%~ metaAttribute %>
    <% }); %>
    <% it.stylesheets.forEach((stylesheet) => { %>
      <link rel="stylesheet" type="text/css" href="<%= it.baseUrl %><%= stylesheet %>" />
    <% }); %>
  </head>
  <body <%~ it.bodyAttributes %> itemscope itemtype="http://schema.org/Organization">
    <meta itemprop="name" content="${customFields.oneLiner}" />
    <meta itemprop="description" content="${customFields.description}" />
    <meta itemprop="url" content="${url}" />
    <meta itemprop="logo" content="${url}${favicon}" />
    <meta itemprop="sameAs" content="${customFields.twitterUrl}" />
    <meta itemprop="sameAs" content="${customFields.linkedInUrl}" />
    <meta itemprop="sameAs" content="${customFields.crunchbaseUrl}" />
    <meta itemprop="sameAs" content="${customFields.githubOrgUrl}" />
    <%~ it.preBodyTags %>
    <div id="__docusaurus">
      <%~ it.appHtml %>
    </div>
    <% it.scripts.forEach((script) => { %>
      <script type="text/javascript" src="<%= it.baseUrl %><%= script %>" defer></script>
    <% }); %>
    <%~ it.postBodyTags %>
    <script defer data-domain="questdb.io" src="https://plausible.io/js/script.js"></script>
  </body>
</html>
`;
