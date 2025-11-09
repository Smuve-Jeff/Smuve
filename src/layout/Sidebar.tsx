               {currentUser && <p className="text-sm text-gray-400 mb-2">Logged              │
 │   in as <strong className="text-gray-200">{currentUser.email}</strong></p>}                 │
 │               {isAuthenticated ? (                                                          │
 │                   <button                                                                   │
 │                       onClick={handleLogout}                                                │
 │                       className="w-full flex items-center justify-center p-3                │
 │   rounded-lg transition-colors duration-200 bg-red-800/70 text-red-200 shadow-lg            │
 │    hover:bg-red-700/70"                                                                     │
 │                       aria-label="Logout"                                                   │
 │                   >                                                                         │
 │                       <i className="fas fa-sign-out-alt w-6 text-center"></i>               │
 │                       <span className="ml-4 font-medium">Logout</span>                      │
 │                   </button>                                                                 │
 │               ) : (                                                                         │
 │                   <button                                                                   │
 │                       onClick={() => toggleAuthModal(true)}                                 │
 │                       className="w-full flex items-center justify-center p-3                │
 │   rounded-lg transition-colors duration-200 bg-indigo-600 text-white shadow-lg              │
 │   hover:bg-indigo-500"                                                                      │
 │                       aria-label="Login / Register"                                         │
 │                   >                                                                         │
 │                       <i className="fas fa-sign-in-alt w-6 text-center"></i>                │
 │                       <span className="ml-4 font-medium">Login / Register</span>            │
 │                   </button>                                                                 │
 │               )}                                                                            │
 │           </div>                                                                            │
 │           <div className="text-center text-white text-xs mt-2">                             │
 │               <p>&copy; 2024 Smuve Jeff Presents</p>                                        │
 │           </div>                                                                            │
 │         </div>                                                                              │
 │       </nav>                                                                                │
 │     );                                                                                      │
 │   };                                                                                        │
 │                                                                                             │
 │   export default React.memo(Sidebar);                                                       │
 │   \`\`\`                                                                                    │
 │
