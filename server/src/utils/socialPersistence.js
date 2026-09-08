import mongoose from 'mongoose'

import { driver } from '../config/neo4j.js'

const socialPostSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String, default: null },
    createdAt: { type: Date, required: true },
    likes: { type: Number, default: 0 },
    likedBy: { type: [mongoose.Schema.Types.Mixed], default: [] },
    comments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    reposts: { type: Number, default: 0 },
    visibility: { type: String, default: 'public' },
    suspended: { type: Boolean, default: false },
  },
  { timestamps: true }
)

const SocialPostModel = mongoose.models.SocialPost || mongoose.model('SocialPost', socialPostSchema)

function toDatabasePost(post = {}) {
  return {
    id: String(post.id),
    userId: String(post.userId),
    username: post.username || 'MiitVerse member',
    content: post.content || '',
    image: post.image || null,
    createdAt: new Date(post.createdAt || Date.now()),
    likes: Number(post.likes || 0),
    likedBy: Array.isArray(post.likedBy) ? post.likedBy : [],
    comments: Array.isArray(post.comments) ? post.comments : [],
    reposts: Number(post.reposts || 0),
    visibility: post.visibility || 'public',
    suspended: Boolean(post.suspended),
  }
}

export async function writeSocialPostToMongo(post) {
  const databasePost = toDatabasePost(post)
  return SocialPostModel.findOneAndUpdate(
    { id: databasePost.id },
    { $set: databasePost },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()
}

export async function deleteSocialPostFromMongo(postId) {
  const normalizedId = String(postId)
  if (!normalizedId) return false

  const result = await SocialPostModel.deleteOne({ id: normalizedId })
  return Boolean(result.deletedCount)
}

export async function listSocialPostsFromMongo(filter = {}) {
  const query = { ...filter }
  if (!Object.prototype.hasOwnProperty.call(query, 'suspended')) {
    query.suspended = { $ne: true }
  }

  const find = typeof globalThis.__mongoFindMock === 'function'
    ? globalThis.__mongoFindMock
    : SocialPostModel.find.bind(SocialPostModel)

  let posts = await find(query)

  if (Array.isArray(posts)) {
    posts = posts.filter((post) => !post || post.suspended !== true)
    posts.sort((left, right) => {
      const leftTime = new Date(left?.createdAt || 0).getTime()
      const rightTime = new Date(right?.createdAt || 0).getTime()
      return rightTime - leftTime
    })
    return posts.map((post) => ({
      ...post,
      createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
    }))
  }

  if (posts && typeof posts.sort === 'function') {
    posts = posts.sort((left, right) => {
      const leftTime = new Date(left?.createdAt || 0).getTime()
      const rightTime = new Date(right?.createdAt || 0).getTime()
      return rightTime - leftTime
    })
  }

  const result = Array.isArray(posts) ? posts : []
  return result.map((post) => ({
    ...post,
    createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
  }))
}

export async function writeSocialPostToNeo4j(post) {
  const databasePost = toDatabasePost(post)
  const session = driver.session()

  try {
    await session.executeWrite((tx) => tx.run(
      `
        MERGE (post:Post { id: $id })
        SET post.userId = $userId,
            post.username = $username,
            post.content = $content,
            post.image = $image,
            post.createdAt = $createdAt,
            post.likes = $likes,
            post.reposts = $reposts,
            post.visibility = $visibility,
            post.suspended = $suspended
        WITH post
        OPTIONAL MATCH (author:User { id: $userId })
        FOREACH (_ IN CASE WHEN author IS NULL THEN [] ELSE [1] END |
          MERGE (author)-[:POSTED]->(post)
        )
        RETURN post
      `,
      {
        ...databasePost,
        createdAt: databasePost.createdAt.toISOString(),
      }
    ))
    return true
  } finally {
    await session.close()
  }
}

// Neo4j is the system-of-record requirement for posts.  Do not silently accept
// a post when its graph write fails; the route returns an error instead.
export async function persistSocialPost(post, deps = {}) {
  const neo4jWriter = deps.neo4jWriter || writeSocialPostToNeo4j
  const mongoWriter = deps.mongoWriter || writeSocialPostToMongo

  await neo4jWriter(post)

  let mongoSaved = false
  try {
    await mongoWriter(post)
    mongoSaved = true
  } catch (error) {
    console.warn('MongoDB post persistence failed:', error.message)
  }

  return { neo4jSaved: true, mongoSaved }
}
