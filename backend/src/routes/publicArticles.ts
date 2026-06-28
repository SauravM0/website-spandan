import { Router } from 'express';
import * as publicArticlesController from '../controllers/publicArticlesController';

const router = Router();

router.get('/', publicArticlesController.listArticles);
router.get('/:slug', publicArticlesController.getArticleDetail);

export default router;
