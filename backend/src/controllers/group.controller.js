import { Group } from '../models/Group.js';
import { GroupMember } from '../models/GroupMember.js';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { cloudinary, isCloudinaryConfigured } from '../config/storage.js';

export const createGroup = async (req, res, next) => {
  try {
    const { name, description, participantIds } = req.body;
    const userId = req.user._id;

    const allParticipantIds = Array.from(new Set([userId.toString(), ...participantIds]));

    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      creator: userId,
      admins: [userId]
    });

    // Add group members
    const memberDocs = allParticipantIds.map((pId) => ({
      groupId: group._id,
      userId: pId,
      role: pId === userId.toString() ? 'admin' : 'member',
      addedBy: userId
    }));

    await GroupMember.insertMany(memberDocs);

    // Create group conversation
    const conversation = await Conversation.create({
      type: 'group',
      participants: allParticipantIds,
      group: group._id,
      unreadCounts: allParticipantIds.map((pId) => ({ user: pId, count: 0 }))
    });

    const populatedGroup = await Group.findById(group._id).populate('creator admins', 'fullName username avatar');

    return res.status(201).json(
      new ApiResponse(201, {
        group: populatedGroup,
        conversationId: conversation._id
      }, 'Group created successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const addGroupMembers = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found');

    const isAdmin = group.admins.some((aId) => aId.toString() === userId.toString());
    if (!isAdmin) {
      throw new ApiError(403, 'Only group admins can add members');
    }

    const conversation = await Conversation.findOne({ group: groupId });
    if (!conversation) throw new ApiError(404, 'Group conversation not found');

    for (const newUserId of userIds) {
      const exists = await GroupMember.findOne({ groupId, userId: newUserId });
      if (!exists) {
        await GroupMember.create({
          groupId,
          userId: newUserId,
          role: 'member',
          addedBy: userId
        });

        if (!conversation.participants.includes(newUserId)) {
          conversation.participants.push(newUserId);
          conversation.unreadCounts.push({ user: newUserId, count: 0 });
        }
      }
    }

    await conversation.save();

    return res.status(200).json(new ApiResponse(200, null, 'Members added successfully'));
  } catch (error) {
    next(error);
  }
};

export const removeGroupMember = async (req, res, next) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found');

    const isAdmin = group.admins.some((aId) => aId.toString() === userId.toString());
    const isSelf = memberId === userId.toString();

    if (!isAdmin && !isSelf) {
      throw new ApiError(403, 'Permission denied');
    }

    await GroupMember.deleteOne({ groupId, userId: memberId });

    // Remove from admins if admin
    group.admins = group.admins.filter((aId) => aId.toString() !== memberId);
    await group.save();

    // Remove from conversation
    await Conversation.updateOne(
      { group: groupId },
      {
        $pull: {
          participants: memberId,
          unreadCounts: { user: memberId }
        }
      }
    );

    return res.status(200).json(new ApiResponse(200, null, 'Member removed successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { name, description, settings } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found');

    const isAdmin = group.admins.some((aId) => aId.toString() === userId.toString());
    if (group.settings?.onlyAdminsCanEditInfo && !isAdmin) {
      throw new ApiError(403, 'Only admins can edit group info');
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (settings && isAdmin) {
      group.settings = { ...group.settings.toObject(), ...settings };
    }

    await group.save();

    return res.status(200).json(new ApiResponse(200, group, 'Group updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateGroupAvatar = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    if (!req.file) throw new ApiError(400, 'Image file required');

    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found');

    const isAdmin = group.admins.some((aId) => aId.toString() === userId.toString());
    if (group.settings?.onlyAdminsCanEditInfo && !isAdmin) {
      throw new ApiError(403, 'Only admins can change group avatar');
    }

    let avatarUrl = '';
    let publicId = '';

    if (isCloudinaryConfigured) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'bakwas/groups',
        transformation: [{ width: 400, height: 400, crop: 'fill' }]
      });
      avatarUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    } else {
      avatarUrl = `/uploads/${req.file.filename}`;
      publicId = req.file.filename;
    }

    group.avatar = { url: avatarUrl, publicId };
    await group.save();

    return res.status(200).json(new ApiResponse(200, group.avatar, 'Group icon updated'));
  } catch (error) {
    next(error);
  }
};

export const getGroupMembers = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const members = await GroupMember.find({ groupId })
      .populate('userId', 'fullName username formattedPhone avatar isOnline lastSeen')
      .sort({ role: 1, joinedAt: 1 });

    return res.status(200).json(new ApiResponse(200, members));
  } catch (error) {
    next(error);
  }
};
