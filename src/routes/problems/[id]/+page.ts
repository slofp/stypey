import type { PageLoad } from './$types';
import { ProblemLoader } from '$services/problemLoader';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
  const problem = await ProblemLoader.getProblem(params.id);
  
  if (!problem) {
    throw error(404, '問題が見つかりませんでした');
  }
  
  return {
    problem
  };
};