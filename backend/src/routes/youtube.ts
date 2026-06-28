import { Router, Request, Response } from 'express';
import { getChannelVideos } from '../services/youtube';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const videos = await getChannelVideos();
  const channelInfo = {
    channelId: process.env.YOUTUBE_CHANNEL_ID,
    channelUrl: `https://youtube.com/channel/${process.env.YOUTUBE_CHANNEL_ID}`,
  };
  res.json({ videos, channel: channelInfo });
});

export default router;
