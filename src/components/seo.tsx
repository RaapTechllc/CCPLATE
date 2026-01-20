import { Metadata } from "next"

interface SEOProps {
  title: string
  description: string
  image?: string
  noIndex?: boolean
}

const siteConfig = {
  name: "CCPLATE",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://example.com",
}

export function generateMetadata({
  title,
  description,
  image,
  noIndex = false,
}: SEOProps): Metadata {
  const fullTitle = `${title} | ${siteConfig.name}`

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      siteName: siteConfig.name,
      type: "website",
      ...(image && {
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      ...(image && { images: [image] }),
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  }
}
