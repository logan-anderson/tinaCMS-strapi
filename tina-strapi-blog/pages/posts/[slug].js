import { useRouter } from 'next/router';
import { fetchGraphql } from 'react-tinacms-strapi-bm-test';
import { useForm, usePlugin, useCMS } from 'tinacms';
import { InlineForm } from 'react-tinacms-inline';

import Container from '../../components/container';
import PostBody from '../../components/post-body';
import Header from '../../components/header';
import PostHeader from '../../components/post-header';
import Layout from '../../components/layout';
import PostTitle from '../../components/post-title';
import Head from 'next/head';
import { CMS_NAME } from '../../lib/constants';

export default function Post({ post: initialPost, morePosts, preview }) {
  const router = useRouter();
  const cms = useCMS();
  const formConfig = {
    id: initialPost.id,
    label: 'Blog Post',
    initialValues: initialPost,
    onSubmit: async (values) => {
      const saveMutation = `
      mutation UpdateBlogPost(
        $id: ID!
        $title: String
        $content: String
        $coverImageId: ID
      ) {
        updateBlogPost(
          input: {
            where: { id: $id }
            data: { title: $title, content: $content, coverImage: $coverImageId}
          }
        ) {
          blogPost {
            id
          }
        }
      }`;
      const response = await fetchGraphql(saveMutation, {
        id: values.id,
        title: values.title,
        content: values.content,
        coverImageId: cms.media.store.getFileId(values.coverImage.url),
      });
      if (response.data) {
        cms.alerts.success('content saved!');
      } else {
        cms.alerts.error('error in saving');
      }
    },
    fields: [],
  };
  const [post, form] = useForm(formConfig);
  usePlugin(form);
  return (
    <Layout preview={preview}>
      <Container>
        <Header />
        {router.isFallback ? (
          <PostTitle>Loading…</PostTitle>
        ) : (
          <>
            <article className="mb-32">
              <Head>
                <title>
                  {post.title} | Next.js Blog Example with {CMS_NAME}
                </title>
                <meta
                  property="og:image"
                  content={process.env.STRAPI_URL + post.coverImage.url}
                />
              </Head>
              <InlineForm form={form}>
                <PostHeader
                  title={post.title}
                  coverImage={process.env.STRAPI_URL + post.coverImage.url}
                  date={post.date}
                  author={post.author}
                />
                <PostBody content={post.content} />
              </InlineForm>
            </article>
          </>
        )}
      </Container>
    </Layout>
  );
}

export async function getStaticProps({ params, preview, previewData }) {
  const postResults = await fetchGraphql(
    `
    query{
      blogPosts(where: {slug: "${params.slug}"}){
        id
        title
        date
        slug
        content
        author {
          name
          picture { 
            url
          }
        }
        coverImage {
          url
        }
      }
    }
  `
  );
  const post = postResults.data.blogPosts[0];

  if (preview) {
    return {
      props: {
        post: {
          ...post,
        },
        preview,
        ...previewData,
      },
    };
  }
  return {
    props: {
      post: {
        ...post,
      },
      preview: false,
    },
  };
}

export async function getStaticPaths() {
  const postResults = await fetchGraphql(
    `
    query{
      blogPosts{
        slug
      }
    }
  `
  );

  return {
    paths: postResults.data.blogPosts.map((post) => {
      return {
        params: {
          slug: post.slug,
        },
      };
    }),
    fallback: false,
  };
}
