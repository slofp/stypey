/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Error {
      message: string;
      code?: string;
    }
    
    interface Locals {
      // Add custom locals here
    }
    
    interface PageData {
      // Add custom page data here
    }
    
    interface PageState {
      // Add custom page state here
    }
    
    interface Platform {
      // Add custom platform here
    }
  }
  
  interface Window {
    ts: typeof import('typescript');
  }
}

export {};