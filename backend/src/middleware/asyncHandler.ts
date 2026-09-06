import { NextFunction, Request, RequestHandler, Response } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    res.locals.metricRoute = {
      baseUrl: req.baseUrl,
      path: req.route?.path,
    };
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
