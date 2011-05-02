Changlog
===

* __1.0.5__: 2011-04-28.  Added [`actor.data()`](http://jeremyckahn.github.com/kapi/actor_doc.html#data).  Actor `draw()` functions now receive the actor object as a parameter (this means a draw function can access actor methods).  SHA: b708575e5380a91a056e2a9f701a8e6e7805f9fc

* __1.0.4__: 2011-04-28.  Fixes [issue 52](https://github.com/jeremyckahn/kapi/issues/52).  Removed a global tween variable.  SHA: 4bfd452063adb89baf75a182d4e7551dda77c1bd

* __1.0.3__: 2011-04-24.  Added `.getContext().`  Actors now have reference to their `kapi` instance through `actorObj.kapi`.  SHA: a1bcdaa8c7b8c1cf0ab2573ae08fbc514f07a3a4

* __1.0.2__: 2011-04-24.  Added `.redraw().` SHA: 6a3348b8a721ea62bf1c1ef0eccd7e508cc26d9d

* __1.0.1__: 2011-04-23.  Fixed a bug in `kapi.gotoFrame()` and `kapi.gotoAndPlay()`.  Fixes [issue 41](https://github.com/jeremyckahn/kapi/issues/41).  Added `kapi.clear()`.  Added options `clearOnComplete` and `clearOnStop`, both of which are `false` by default. SHA: 8a81bc714c151ef63b41af8ad5c4df1a82f79dea

* __1.0.0__: 2011-04-09.  Initial stable release. SHA: e3b089e3b239eabfbcb040fed894e7b468b73772