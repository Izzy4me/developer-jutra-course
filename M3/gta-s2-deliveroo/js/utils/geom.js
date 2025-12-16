// Geometry & collision utilities wrapper.
// Re-exports functions from the original inline script (attached to window).
function missing(name) {
  return function() { throw new Error(name + ' is not available on window. Ensure original script loaded.'); };
}

export const getCorners = (typeof window !== 'undefined' && window.getCorners) ? window.getCorners : missing('getCorners');
export const projectPolygon = (typeof window !== 'undefined' && window.projectPolygon) ? window.projectPolygon : missing('projectPolygon');
export const overlap = (typeof window !== 'undefined' && window.overlap) ? window.overlap : missing('overlap');
export const checkRectCollision = (typeof window !== 'undefined' && window.checkRectCollision) ? window.checkRectCollision : missing('checkRectCollision');
export const checkCircleRectCollision = (typeof window !== 'undefined' && window.checkCircleRectCollision) ? window.checkCircleRectCollision : missing('checkCircleRectCollision');
export const isPointInRotatedRect = (typeof window !== 'undefined' && window.isPointInRotatedRect) ? window.isPointInRotatedRect : missing('isPointInRotatedRect');

export default {
  getCorners,
  projectPolygon,
  overlap,
  checkRectCollision,
  checkCircleRectCollision,
  isPointInRotatedRect,
};
