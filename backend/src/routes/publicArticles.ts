import { Router } from 'express';
import * as publicArticlesController from '../controllers/publicArticlesController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.get('/', asyncHandler(publicArticlesController.listArticles));
router.get('/:slug', asyncHandler(publicArticlesController.getArticleDetail));

export default router;
