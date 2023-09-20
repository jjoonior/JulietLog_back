import {discussionRepository} from '@/repository/discussion.repository';
import {verifyToken, redisCli as redisClient} from "@/utils";
import db from '@/database/index';

export const discussionService = {
    getUserIdFromToken: async (req) => {
        const token = req.cookies["accessToken"];
        if (!token) {
            return false;
        }

        const verifyResult = verifyToken(token);
        if (verifyResult.error) {
            return false
        }

        return  verifyResult.userId;
    },

    createDiscussion: async (dto) => {
        const transaction = await db.sequelize.transaction();
        const promises = [];

        try {
            dto.view = 0;
            dto.like = 0;

            const discussion = await discussionRepository.createDiscussion(dto,transaction);
            if (dto.category.length > 0) {
                promises.push(discussionRepository.createCategory(discussion.discussionId, dto.category, transaction));
            }
            if (dto.image.length > 0) {
                promises.push(discussionRepository.createImage(discussion.discussionId, dto.image, transaction));
            }

            await Promise.all(promises);
            await transaction.commit();

            return discussion;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error);
        }
    },

    updateDiscussion: async (dto) => {
        const transaction = await db.sequelize.transaction();

        try {
            const discussion = await discussionRepository.getDiscussionById(dto.discussionId);

            if (!discussion) {
                return 'Non-existent discussion';
            }
            if (Number(discussion.userId) !== Number(dto.userId)) {
                return 'Not the author';
            }

            await discussionRepository.updateDiscussion(dto, transaction);
            await discussionRepository.updateDiscussionCategory(dto.discussionId, dto.category, transaction);
            await discussionRepository.updateDiscussionImage(dto.discussionId, dto.image, transaction);

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error);
        }
    },

    deleteDiscussion: async (discussionId, userId) => {
        try {
            const discussion = await discussionRepository.getDiscussionById(discussionId);

            if (!discussion) {
                return 'Non-existent discussion';
            }
            if (Number(discussion.userId) !== Number(userId)) {
                return 'Not the author';
            }

            await discussionRepository.deleteDiscussion(discussionId);
        } catch (error) {
            throw new Error(error);
        }
    },

    getDiscussionByPage: async (page, pageSize, sort, userId) => {
        try {
            const offset = (page - 1) * pageSize || 0;
            const limit = pageSize;
            let order = [['createdAt', 'DESC']];

            if (sort === 'views') {
                order = [['view', 'DESC']]; // 조회수 순으로 정렬
            }

            const discussions = await discussionRepository.getDiscussionByPage(offset, limit, order);

            const totalPages = Math.ceil(discussions.count / pageSize);

            const results = [];
            for (const discussion of discussions.rows) {
                const result = {
                    discussionId: discussion.discussionId,
                    thumbnail: discussion.thumbnail,
                    title: discussion.title,
                    createdAt: discussion.createdAt,
                    categories: discussion.categories.map((category) => category.category),
                    bookmarked: false,
                    liked: false,
                    like: discussion.like,
                    view: discussion.view,
                    // remainingTime: (discussion.endTime - new Date()) / 1000
                };

                const userProfile = await discussionRepository.getProfileById(discussion.userId);
                result.nickname = userProfile.nickname;

                if (userId) {
                    const bookmark = await discussionRepository.getBookmarkById(userId, discussion.discussionId);
                    result.bookmarked = !!bookmark;
                    const like = await discussionRepository.getLikeById(userId, discussion.discussionId);
                    result.liked = !!like;
                }

                results.push(result);
            }

            return {
                hasMore: totalPages > page,
                discussions: results
            }
        } catch (error) {
            throw new Error(error);
        }
    },

};