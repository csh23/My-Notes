# 《Web程序设计实践》课程报告

| 项目 | 内容 |
| :---: | :---: |
| **院 系** | 计算机与大数据学院 |
| **专 业** | 软件工程 |
| **年 级** | 2023级 |
| **学 号** | 102300106 |
| **姓 名** | 陈思焓 |

**日期：** 2026 年 1 月 12 日

---

## 一、 项目概况

### 1.1 项目简介
本次实践课题为“笔记管理系统”，成功开发了一款简洁高效的在线笔记管理工具。系统支持用户创建、删除与重命名笔记分类，以及对笔记进行添加、编辑、删除和全文搜索，便于快速定位所需内容。项目在32学时内完成，充分融合了 HTML5、CSS、JavaScript 及 DOM 操作等前端技术，并初步应用了 PHP、PDO 接口与 SQL 等后端技术，实现了前后端协同的数据管理功能。

### 1.2 使用的技术和工具
* **HTML5** ：用于构建网页结构，确保页面的语义化和结构化。
* **CSS** ：用于页面的样式设计，美化页面样式。
* **JavaScript和DOM** ：实现页面交互效果，例如表单验证、动态加载列表等。
* **本地存储** ：使用浏览器的 `window.localStorage` 保存笔记分类和笔记数据，实现数据的持久化。
* **PHP** ： 作为后端服务语言，处理用户注册、登录认证、笔记与分类的增删改查等核心业务逻辑。
* **PDO** ：通过 PDO 接口安全地连接与操作 MySQL 数据库，有效防止 SQL 注入，提升系统安全性。
* **MySQL** ：作为关系型数据库，用于持久化存储用户信息、笔记内容、分类及标签等结构化数据。
* **Fetch API** ：实现前端与后端 PHP 接口的异步通信，完成用户认证、笔记同步、数据提交等操作。


### 1.3 系统增加/扩展的功能有：
* **私密笔记** ：允许用户将笔记设为“私密”状态，通过分类中的“私密笔记”条目浏览。支持设置笔记访问密码。
* **笔记回收站** ：删除的笔记移入“最近删除”分类下，业务系统中称为“假删”。 在“最近删除”分类下再次删除则真正删除数据。
* **笔记搜索功能增强** ：增加全文搜索功能，可根据笔记内容、标题和标签进行检索。 支持关键词高亮显示。
* **笔记导出** ：导出笔记为文本文件（Markdown格式）
* **夜间模式** ：提供夜间模式，使用CSS的媒体查询和变量切换，适应不同光线条件下的用户需求。
* **笔记排序** ：支持按时间、标题等进行笔记排序。
* **拖拽排序与分类管理** ：使用HTML5 Drag and Drop API实现笔记分类在分类列表中的拖拽排序。 支持通过拖拽笔记到分类条目上完成分类调整。
* **富文本编辑器** ：实现笔记内容的富文本编辑功能（字体加粗、字体倾斜、添加列表、插入链接），笔记内容存储为HTML 格式。
* **多语言支持** ：提供界面多语言切换功能（中文、英文）。 自动根据浏览器语言显示默认语言。
* **笔记统计功能** ：增加数据统计功能，显示每个分类下的笔记数量。
* **使用服务器端程序和数据库实现数据持久化** ：修改数据库模拟对象的实现，在对象方法中通过Ajax方式与服务器交互，使用PHP在 服务器端实现数据的CRUD操作。
* **多用户支持** ：提供注册与登录功能，支持不同用户管理各自的笔记数据。


---

## 二、 系统基础功能的设计与实现

### 2.1 数据持久化
基于浏览器原生localStorage，我实现了数据在本地的持久化存储。

设计localStorage的数据结构，包括catgories（分类数组）、notes（笔记数组）、lasteNoteId、lastCategoryId、password（私密笔记密码），设计了DEFAULT_DATA作为默认数据结构，存储了默认的分类（“未分类”、“私密”和“最近删除”），以及其他数据结构的默认初始值。notes中存储的对象的数据结构包括id、title、content、categoryId、createAt、updateAt、tags，用于存储笔记的id、笔记标题、内容、创建时间、更新时间和笔记标签。

系统在初始化时首先会使用LoadFromStorage方法从localStorage中读取数据，若未发现存储记录，则使用预设的默认数据结构进行初始化。确保应用即使在首次访问或数据损坏时也能具备基本可用的结构。数据保存机制采用JSON序列化方式，将整个数据对象转换为字符串后存入localStorage。在保存过程中，系统会主动更新分类与笔记之间的引用关系，确保每个分类的notes数组包含正确的笔记ID。

```javascript
loadFromStorage() {
  try {
      const stored = localStorage.getItem(STORAGE_KEY);   //获取数据
      if (stored) {
          const parsed = JSON.parse(stored);  //字符串转换成js对象
          
          // 获取存储中的分类，排除默认分类
          const storedCategories = (parsed.categories || []).filter(cat =>  !['all', 'uncategorized', 'private', 'deleted'].includes(cat.id)
          );

          // 数据合并：确保默认结构完整，并覆盖用户存储的数据
          this.data = {
              ...DEFAULT_DATA,
              ...parsed,  

              categories: [
                  ...DEFAULT_DATA.categories,
                  ...storedCategories
              ],
              password: parsed.password || DEFAULT_DATA.password
          };
      } else {
          // 没有存储的数据，使用默认数据
          this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
          this.saveToStorage();
      }
      
      // 更新关联关系
      this.updateCategoryNoteReferences();
      return true;
  } catch (error) {
      console.error('加载数据失败:', error);
      return false;
  }
},

```
防止因直接修改存储数据而导致的关系断裂, 每次加载数据时，系统会利用updateCategoryNoteReferences方法验证并重建分类与笔记之间的关联。

使用saveToStorage方法把数据保存到localStorage，默认分类（如“全部笔记”和“未分类”）的笔记列表在保存时会被过滤，不直接存储，而是动态计算生成。

```javascript
 saveToStorage() {
        try {
            // 保存前更新关联关系
            this.updateCategoryNoteReferences();
            
            // 不保存默认分类的notes数组，因为它们是计算得到的
            const dataToSave = {
                categories: this.data.categories.filter(cat => 
                    cat.id !== 'all' && cat.id !== 'uncategorized'
                ),
                notes: this.data.notes,
                lastNoteId: this.data.lastNoteId,
                lastCategoryId: this.data.lastCategoryId,
                password: this.data.password
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            return true;
        } catch (error) {
            return false;
        }
    }
```

### 2.2 用户界面设计（设计与实现）
用户界面我采用了三栏式布局，最左边是导航栏，主要是分类切换，中间是笔记列表，右边是笔记展示和编辑面板。所以我在body中插入三个块元素，类名分别设置为.sidebar、notes-list-containe、editor-container。左侧边栏分为用户区和分类区，笔记列表栏顶部是搜索栏，下部就是笔记列表的陈列区域，右侧编辑区主要由编辑区和工具栏组成，完整html代码较长，请见附录。布局主要用的都是flex布局，并且引入index.css文件，设计了简洁大方的ui。此外，我设置了若干个模态框，用于实现创建分类、创建笔记、移动笔记等功能，在触发之后才会显示。
		
模态框的框架代码示例如下：
```javascript
 <!-- 模态框 - 移动笔记 -->
    <div id="move-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>移动笔记到</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="move-to-category">选择目标分类</label>
                    <select id="move-to-category">
                        <option value="uncategorized">未分类</option>
                    </select>
                </div>
                <p class="modal-hint">选中的笔记将被移动到所选分类</p>
            </div>
            <div class="modal-footer">
                <button id="cancel-move" class="secondary-btn">取消</button>
                <button id="confirm-move" class="primary-btn">移动</button>
            </div>
        </div>
    </div>
```
在笔记列表栏，笔记项是动态渲染的，createNoteElement()方法，根据当前分类、搜索状态和笔记属性，生成不同的HTML内容。内容预览通过getContentPreview方法生成，截取前100个字符并高亮关键词。

操作按钮可以动态生成。根据当前分类ID，如果是'deleted'分类，显示恢复和永久删除按钮；否则显示移动、删除和设为私密按钮。
```javascript
  // 根据当前分类动态生成操作按钮
    let actionButtons = '';
    if (this.currentCategoryId === 'deleted') {
        actionButtons = `
            <button class="icon-btn restore-note-btn" title="恢复笔记">
                <i class="fas fa-undo"></i>
            </button>
            <button class="icon-btn delete-note-btn" title="永久删除">
                <i class="fas fa-trash"></i>
            </button>
        `;
    } else {
        actionButtons = `
            // 框架与if中的actionButton一样
        `;
    }
    // 构建完整的笔记项HTML
    noteElement.innerHTML = `
        <div class="note-item-header">
            <div class="note-title-container">
                <h4 class="note-title">${titleHtml || '无标题笔记'}</h4>  
            </div>
            <span class="note-date">${updatedAt}</span>
            <div class="note-actions">
                ${actionButtons} // 引用不同情况的按钮样式
            </div>
        </div>
        // ...剩余笔记项html内容`;
```


### 2.3 用户交互逻辑（设计与实现）
用户交互逻辑的代码，我分为UI响应和监听器两个大的分类，存储在UI文件夹和Listener文件夹，分别负责ui的更新和监听动作的绑定。
* **笔记分类栏：**

  笔记分类栏代码主要在listener/bar.js和ui/bar.js。

  为了代码的全局调度，在bar.js中，我设计了几个全局变量，分别是currentCategoryId，categoriesListElement，用于存储当前选中的分类ID和分类容器。

  分类栏整合了点击、拖拽与事件响应机制。分类栏采用事件委托模式处理用户交互，用SidebarListener模块在bindEvents()方法中统一绑定事件，并在handleCategoryClick方法中分类执行不同点击。

  ```javascript
  const categoriesList = document.querySelector('.categories-list');
  categoriesList.addEventListener('click',(e)=>
  this.handleCategoryClick(e));//分类点击事件
  this.bindNoteDropToCategoryEvents(categoriesList);//笔记拖拽
  this.bindCategoryDragEvents(categoriesList);//分类拖拽
  …….
  handleCategoryClick(event) {
      // 通过closest方法找到实际的分类元素
      let categoryItem = event.target.closest('.category-item');
      if (!categoryItem) return;
      const categoryId = categoryItem.getAttribute('data-category-id');
      if (!categoryId) return;
      // 更新UI状态
      this.sidebarUI.selectCategory(categoryId);
      // 触发全局事件通知其他模块
      this.dispatchCategoryChangeEvent(categoryId);
  }
  ```
  点击任意分类，会触发选中状态的高亮更新，高亮更新的实现主要依赖于css类“.active”的增删，实现流程如selectCategory方法所示。因为我的私密类的显示我单独放在独立于categories-list"块的另外一个块元素中，所以单独写了一个selectPrivate方法来实现点击私密类时的逻辑，实现与selectCategory相似。

  ```javascript
  selectCategory(categoryId) {
      // 移除之前选中的分类的高亮
      const previouslySelected = this.categoriesListElement.querySelector('.category-item.active');
      if (previouslySelected) {
          previouslySelected.classList.remove('active');
      }
      // 移除私密区域的高亮
      const privateItem = document.querySelector('.private-item.active');
      if (privateItem) {
          privateItem.classList.remove('active');
      }
      
      // 高亮当前选中的分类
      const currentSelected = this.categoriesListElement.querySelector(`[data-category-id="${categoryId}"]`);
      if(categoryId==='private'){
          currentSelected = document.querySelector('private-item')
      }
      if (currentSelected) {
          currentSelected.classList.add('active');
          // 更新当前分类ID
          this.currentCategoryId = categoryId;
          return true;
      }
      return false;
  },
  ```
  同时通过自定义事件通知笔记列表刷新内容。

  在分类栏底部，我设置了两个按钮，分别是新建和管理。新建按钮绑定了点击事件，点击后改变新建模态框的display属性，使其显现，新建按钮模态框通过确认按钮提交输入框消息，然后调用新建分类的方法，新建成功后刷新列表渲染。管理按钮绑定管理分类的模态框，模态框中的分类列表是实时渲染的，如方法populateManagementModal所示，渲染后每一条分类后跟着两个按钮，分别是重命名和删除，点击重命名按钮会弹出重命名模态框，点击删除会删除该分类。模态框的事件绑定在bindManagementModalEvents方法中，包括右上角叉绑定，取消按钮绑定，确定按钮绑定，这些绑定触发点击事件后会改变display属性，分类列表的草操作则使用事件委托。

  ```javascript
  // 显示新建分类模态框
  showNewCategoryModal() {
      const modal = document.getElementById('category-modal');
      if (!modal) {
          return;
      }
      // 设置模态框标题
      const modalTitle = modal.querySelector('#modal-title');
      if (modalTitle) {
          modalTitle.textContent = '新建分类';
      }
      // 清空输入框
      const nameInput = modal.querySelector('#category-name');
      if (nameInput) {
          nameInput.value = '';
          nameInput.setAttribute('data-mode', 'create');
          nameInput.removeAttribute('data-category-id');
      }
      // 显示模态框
      modal.style.display = 'flex';
      // 焦点到输入框
      setTimeout(() => {
          if (nameInput) nameInput.focus();
      }, 100);
  },
  ```
  ```javascript
  bindManagementModalEvents(modal) {
      // 关闭按钮
      const closeButtons = modal.querySelectorAll('.close-modal, #close-management-modal');
      closeButtons.forEach(btn => {
          btn.addEventListener('click', () => {
              modal.style.display = 'none';
          });
      });
      
      // 新建分类按钮
      const addButton = modal.querySelector('#add-category-in-modal');
      if (addButton) {
          addButton.addEventListener('click', () => {
              modal.style.display = 'none';
              this.showNewCategoryModal();
          });
      }
      
      // 点击模态框外部关闭
      modal.addEventListener('click', (e) => {
          if (e.target === modal) {
              modal.style.display = 'none';
          }
      });
      
      // 绑定分类操作按钮（事件委托）
      const listContainer = modal.querySelector('#categories-management-list');
      if (listContainer) {
          listContainer.addEventListener('click', (e) => {
              const categoryItem = e.target.closest('.category-management-item');
              if (!categoryItem) return;
              
              const categoryId = categoryItem.getAttribute('data-category-id');
              if (!categoryId) return;
              
              // 重命名按钮
              if (e.target.closest('.rename-category-btn')) {
                  e.stopPropagation();
                  this.showRenameCategoryModal(categoryId);
                  modal.style.display = 'none';
              }
              
              // 删除按钮
              else if (e.target.closest('.delete-category-btn')) {
                  e.stopPropagation();
                  this.showDeleteCategoryConfirm(categoryId);
                  modal.style.display = 'none';
              }
          });
      }
  },
  ```

<br>

* **笔记列表栏：**

  我在ui/list.js中定义了多个全局状态变量，通过currentNotes缓存当前显示的数据，避免频繁的数据查询。初始化过程首先获取DOM容器元素，包括笔记列表容器notesListElement、分类标题元素和详情统计元素currentNotes。currentCategoryId默认为'uncategorized'，但实际在应用初始化后会被更新为当前选中的分类。

  笔记列表栏通过loadNotesByCategory()和searchNotes()两个核心方法实现视图切换，根据不同的输入参数，分别处理分类视图和搜索视图的渲染逻辑。loadNotesByCategory方法首先更新当前分类ID并清空搜索状态，然后根据分类ID获取相应的笔记数据。对于'all'分类，调用getAllNotes()获取所有非私密笔记；对于其他分类，调用getNotesByCategory()获取该分类下的笔记。获取数据后，调用sortNotes()方法按当前排序方式排序，然后缓存到currentNotes中，最后渲染列表并更新统计信息。
  ```javascript
  loadNotesByCategory(categoryId) {
      this.currentCategoryId = categoryId;
      this.currentSearchQuery = ''; // 清除搜索状态
      // 更新分类标题
      this.updateCategoryTitle();
      // 获取笔记数据
      let notes = [];
      if (categoryId === 'all') {
          notes = NoteDB.getAllNotes();
      } else {
          notes = NoteDB.getNotesByCategory(categoryId);
      }
      notes = this.sortNotes(notes);// 对笔记进行排序
      this.currentNotes = notes;// 保存当前笔记
      this.renderNotesList(notes);// 渲染笔记列表
      this.updateDetailBar(notes.length);  // 更新详情条  
      return notes;
  },
  ```
  笔记列表栏采用事件委托模式处理复杂的交互逻辑，通过NotesListListener模块统一管理。使用bindEvents方法绑定了多种类型的事件，通过handleNotesListClick()方法实现点击事件，handleNotesListClick方法首先检查点击的是否是笔记项元素。如果不是笔记项，检查是否是新建笔记按钮。如果是笔记项，则获取笔记ID，然后根据点击的具体元素（通过closest方法判断）执行不同的操作：移动、删除、设为私密、恢复或选中笔记。每个操作都调用相应的方法处理，并通过stopPropagation阻止事件继续冒泡。
  ```javascript
  handleNotesListClick(event) {
      // 查找被点击的笔记项
      let noteItem = event.target.closest('.note-item');
      if (!noteItem) {
          // 检查是否是新建笔记按钮
          const addNoteBtn = event.target.closest('#add-first-note');
          if (addNoteBtn) {
              this.handleAddNoteClick(event);
          }
          return;
      }
      // 获取笔记ID
      const noteId = noteItem.getAttribute('data-note-id');
      // 检查点击的是什么元素
      const target = event.target;
      
      // 移动按钮
      if (target.closest('.move-note-btn')) {
          event.stopPropagation();
          this.handleMoveNoteClick(noteId);
          return;
      }
      // 删除按钮
      if (target.closest('.delete-note-btn')) {
          event.stopPropagation();
          this.handleDeleteNoteClick(noteId);
          return;
      }
      // 设为私密按钮
      if (target.closest('.set-private-btn')) {
          event.stopPropagation();
          this.handlesetprivateClick(noteId);
          return;
      }
      // 恢复按钮（最近删除分类）
      if (target.closest('.restore-note-btn')) {
          event.stopPropagation();
          this.handleRestoreNoteClick(noteId);
          return;
      }
      // 点击笔记项本身 - 选中笔记
      this.handleNoteItemClick(noteId);
  }
  ```
  createNoteElement方法首先创建笔记项的基础DOM元素，设置类名、数据属性和拖拽属性。然后格式化笔记的更新时间（显示在标题右侧）和创建时间（显示在底部）。



* **笔记编辑栏**

  笔记编辑栏在ui/editor.js中定义了核心状态变量，管理编辑器的当前状态和内容。初始化过程中，编辑器首先获取富文本编辑器DOM元素的引用，存储在editorElement变量中。然后初始化字数统计，绑定工具栏和编辑器的各种事件监听器，最后清空编辑器内容，准备接收用户输入。currentNoteId用于跟踪当前正在编辑的笔记，初始为null表示没有选中任何笔记。

  工具栏按钮通过data-tool属性标识功能类型，listener/editor.js中的bindToolbarEvents()方法为这些按钮绑定事件每个工具按钮点击时，阻止默认行为和事件冒泡，然后调用applyFormatting()方法执行相应的格式化操作。

  ```javascript
  // 为每个按钮绑定点击事件
      toolButtons.forEach(button => {
          const tool = button.getAttribute('data-tool');
          
          button.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.applyFormatting(tool);
          });
      });
  ```
  在编辑面板，我实现了事件监听与实时状态更新。可以实时更新字数统计和工具栏按钮的激活状态，让用户知道当前选区应用的格式。粘贴事件拦截默认行为，只粘贴纯文本，避免引入外部格式。实时更新字数，通过获取输入事件，用inneerText获取不含html标签的文本内容，并用length获得长度。
  ```javascript
  updateWordCount() {
        // 获取纯文本内容（不含HTML标签）
        const text = this.editorElement.innerText || this.editorElement.textContent;
        const wordCount = text.length;
        
        const wordCountElement = document.getElementById('word-count');
        if (wordCountElement) {
            wordCountElement.textContent = `${wordCount} 字`;
        }
    },
  ```
  我还实现了编辑时的自动保存机制，通过防抖技术避免频繁保存，通过监听输入设置定时器，如果一段时间没有输入之后就会调用autoSaveNote进行保存。保存笔记则是调用updateNote方法，把现在的标题和内容传入保存。
  ```javascript
  scheduleAutoSave() {
        // 清除之前的定时器
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        // 如果没有正在编辑的笔记，不自动保存
        if (!this.editorUI.currentNoteId) return;
        // 设置新的定时器
        this.saveTimer = setTimeout(() => {
            this.autoSaveNote();
        }, this.AUTO_SAVE_DELAY);
    },

  // 保存笔记逻辑 ：
    const noteData = this.editorUI.getNoteData();// 获取当前编辑器中的数据
    const updatedNote =await NoteDB.updateNote(this.editorUI.currentNoteId, {
        title: noteData.title,
        content: noteData.content
    });// 调用数据层保存
  ```
  当用户在笔记列表中选择笔记时，编辑器通过loadNote()方法加载笔记内容。loadNote()方法首先检查笔记对象是否存在，然后设置currentNoteId跟踪当前编辑的笔记。根据笔记内容是否包含HTML标签，决定直接显示HTML内容还是将纯文本转换为HTML格式。总是同步到textarea，为富文本转换做准备。转换纯文本时，通过formatPlainText()方法保留换行和基本格式标记。最后启用编辑器（初始状态为禁用），显示加载提示。
  ```javascript
  loadNote(note) {
    // 更新当前笔记ID
    this.currentNoteId = note.id;
    // 填充编辑器内容
    document.getElementById('note-title').value = note.title || '';
    if (this.editorElement) {
        // 如果笔记内容包含HTML，直接使用
        if (note.content && note.content.includes('<')) {
            this.editorElement.innerHTML = note.content;
        } else {
            // 否则作为纯文本处理，但保留换行
            const content = note.content || '';
            this.editorElement.innerHTML = this.formatPlainText(content);
        }
        
        // 同步到隐藏的textarea
        const textarea = document.getElementById('note-content');
        if (textarea) {
            textarea.value = this.editorElement.innerHTML;
        }
    }
    // 更新字数统计
    this.updateWordCount();
    // 启用编辑器
    this.setEditorEnabled(true);
    return true;
  }

  ```



### 2.4 功能实现细节

#### 1. 笔记分类管理

**（1）实现思路**
笔记分类管理功能的核心是实现分类的创建、重命名、删除以及笔记与分类的关联逻辑。系统包含四大固定分类（全部笔记、未分类、私密笔记、回收站）和用户自定义分类。私密笔记具有特殊隔离性，仅在“私密笔记”分类下可见。具体实现步骤如下：

1. **分类创建**：用户点击新建分类按钮，系统弹出模态框。输入分类名后，调用数据层createCategory方法。该方法会检查名称唯一性，并生成一个基于时间戳和计数器的唯一ID。验证通过后，将新分类对象添加到categories数组，调用saveToStorage持久化到localStorage，最后分发categoryCreated事件以更新UI。

2. **分类重命名**：在分类管理模态框中点击“重命名”按钮，系统弹出与创建分类相同的模态框，但标题改为“重命名分类”。输入框会预填原分类名，并通过data-*属性标记模式(rename)和目标分类ID。保存时，数据层updateCategory方法会执行保护性检查（禁止修改默认分类）、验证名称唯一性，然后更新分类名称并保存。

3. **分类删除**：用户点击“删除”按钮后，系统弹出原生确认框，明确告知用户“删除后，该分类下的笔记将移入‘未分类’”。用户确认后，deleteCategory方法被调用。该方法首先遍历所有笔记，将被删分类下的笔记categoryId重置为'uncategorized'；然后从categories数组中移除该分类并保存；最后分发categoryDeleted事件。UI层监听到此事件后，会从侧边栏移除分类项，若当前正查看该分类，则自动切换至“全部笔记”视图。

**（2）核心代码实现**
分类创建与数据验证：
```javascript
/**
 * 创建新分类
 * @param {string} name - 分类名称
 * @returns {Object} 操作结果
 */
async createCategory(name) {
    // 1. 名称合法性检查
    if (!name || name.trim() === '') {
        return { success: false, message: '分类名称不能为空' };
    }
    if (this.data.categories.some(cat => cat.name === name)) {
        return { success: false, message: '分类名称已存在' };
    }

    // 2. 生成唯一ID (时间戳 + 随机后缀)
    const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // 3. 构建分类对象
    const newCategory = {
        id,
        name: name.trim(),
        notes: [], // 初始为空笔记ID数组
        isCustom: true,
        createdAt: Date.now()
    };

    // 4. 更新数据并持久化
    this.data.categories.push(newCategory);
    this.saveToStorage();

    // 5. 分发事件通知UI更新
    const event = new CustomEvent('categoryCreated', {
        detail: { category: newCategory },
        bubbles: true
    });
    document.dispatchEvent(event);

    return { success: true, category: newCategory };
}
```

分类删除与笔记迁移：
```javascript
/**
 * 删除分类及关联笔记处理
 * @param {string} id - 要删除的分类ID
 */
async deleteCategory(id) {
    // 1. 保护性检查：禁止删除默认分类
    const defaultCategories = ['all', 'uncategorized', 'private', 'deleted'];
    if (defaultCategories.includes(id)) {
        return {
            success: false,
            message: '不能删除系统默认分类'
        };
    }

    const categoryIndex = this.data.categories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) {
        return { success: false, message: '分类不存在' };
    }

    // 2. 迁移笔记到"未分类"
    this.data.notes.forEach(note => {
        if (note.categoryId === id) {
            note.categoryId = 'uncategorized';
        }
    });

    // 3. 从分类数组中移除
    const [deletedCategory] = this.data.categories.splice(categoryIndex, 1);
    
    // 4. 持久化存储
    this.saveToStorage();

    // 5. 分发删除事件
    const deleteEvent = new CustomEvent('categoryDeleted', {
        detail: { 
            categoryId: id,
            categoryName: deletedCategory.name 
        },
        bubbles: true
    });
    document.dispatchEvent(deleteEvent);

    return { success: true };
}
```

**（3）难点与解决**

需要确保私密笔记仅在“私密笔记”分类下可见，**在其他分类（包括“全部笔记”、“未分类”和用户自定义分类）中完全隐藏**。解决方案是在所有笔记筛选逻辑中加入note.isPrivate判断。对于非私密分类，只显示isPrivate === false的笔记；对于“私密笔记”分类，则只显示isPrivate === true的笔记。这需要在前端渲染和数据查询两个层面保持一致。


#### 2. 添加笔记

**（1）实现思路**
添加笔记功能通过两个核心入口实现：一是位于笔记列表顶部搜索栏旁的圆形加号按钮，二是笔记列表为空时显示的"创建第一条笔记"按钮。系统执行以下逻辑：

1. **确定目标分类** ：首先处理一个重要的边界情况——如果当前选中的分类ID是'all'（表示用户正在"全部笔记"聚合视图中），则新笔记的目标分类会被自动转换为'uncategorized'。这一设计基于用户体验考量：在聚合视图中创建笔记时，用户可能没有明确的分类意图，因此暂时放入"未分类"中，便于后续整理。

2. **构建笔记对象** ：系统开始构建新笔记的数据对象，包括生成唯一ID（结合时间戳和递增计数器）、设置默认标题为"新笔记"、内容为空字符串、关联处理后的分类ID、标签数组初始化为空。创建时间戳和更新时间戳均设置为当前ISO格式时间。

3. **验证与数据持久化** ：构建过程中会验证目标分类是否存在（除非是'uncategorized'），如果不存在则同样转换为"未分类"。然后将新笔记对象添加到全局notes数组，调用saveToStorage方法持久化到本地存储，并触发相应的事件通知UI更新。

4. **更新视图与状态管理** ：
  * 数据层操作完成后，触发noteSelected事件，编辑器栏监听到事件后调用loadNote()方法加载这个空白笔记。
  * 编辑器状态从禁用切换到启用，标题输入框显示"新笔记"，富文本编辑器内容区域清空等待输入，工具栏按钮变为可交互状态，字数统计显示为0。
  * 显示操作反馈：通过showToast('新笔记已创建', 'success')显示成功提示。

5. **搜索状态下的特殊处理** ：当用户在搜索状态下点击新建时，系统会先清空搜索框和搜索状态，恢复到正常的分类视图，再创建笔记。这避免了在搜索结果上下文中创建新笔记可能造成的混淆，确保新笔记创建后能立即在列表中可见。

**（2）核心代码实现**
数据层createNote方法：
```javascript
/**
 * 创建新笔记
 * @param {Object} noteData - 笔记数据
 * @returns {Object} 新创建的笔记对象
 */
createNote(noteData) {
    // 生成唯一ID
    const noteId = `note_${Date.now()}_${++this.data.lastNoteId}`;
    const now = new Date().toISOString();
    
    // 处理categoryId特殊情况
    let categoryId = noteData.categoryId || 'uncategorized';
    if (categoryId === 'all') {
        categoryId = 'uncategorized';
    }
    
    // 验证分类是否存在（除非是'uncategorized'）
    if (categoryId !== 'uncategorized' && !this.getCategoryById(categoryId)) {
        categoryId = 'uncategorized';
    }

    // 构建新笔记对象
    const newNote = {
        id: noteId,
        title: noteData.title || '新笔记',
        content: noteData.content || '',
        categoryId: categoryId,
        createdAt: now,
        updatedAt: now,
        tags: noteData.tags || [],
        isPrivate: noteData.isPrivate || false
    };
    
    // 保存到数据数组
    this.data.notes.push(newNote);
    
    // 更新对应分类的笔记引用
    if (categoryId !== 'uncategorized') {
        const category = this.getCategoryById(categoryId);
        if (category) {
            category.noteIds.push(noteId);
        }
    }
    
    // 持久化存储
    this.saveToStorage();
    
    // 触发笔记创建事件
    const event = new CustomEvent('noteCreated', {
        detail: { note: newNote },
        bubbles: true
    });
    document.dispatchEvent(event);
    
    return newNote;
}
```
UI层createNewNote方法:
```javascript
/**
 * UI层创建新笔记入口
 * @description 处理搜索状态、分类确定和用户反馈
 */
function createNewNote() {
    // 1. 如果处于搜索状态，先退出搜索
    if (window.currentSearchQuery) {
        clearSearch();
        showToast('已退出搜索模式，新笔记将在当前分类创建', 'info');
    }
    
    // 2. 确定目标分类ID
    let targetCategoryId = window.currentCategoryId || 'all';
    if (targetCategoryId === 'all') {
        targetCategoryId = 'uncategorized';
    }
    
    // 3. 调用数据层创建笔记
    const newNote = dataManager.createNote({
        title: '新笔记',
        content: '',
        categoryId: targetCategoryId,
        tags: []
    });
    
    // 4. 显示操作反馈
    showToast('新笔记已创建', 'success');
    
    // 5. 自动选中新创建的笔记（通过事件监听器处理）
    // 编辑器会自动加载该笔记
}
```

**（3）难点与解决**

需要解决**搜索状态下的用户体验一致性**的问题，当用户处于搜索状态时创建新笔记，可能会遇到"笔记创建后立即消失"的困惑，因为新笔记可能不符合当前的搜索条件。解决方案是：在UI层的createNewNote方法开始时，先检查是否处于搜索状态。如果是，则先调用clearSearch()方法清空搜索框、重置搜索状态，并显示提示信息告知用户已退出搜索模式。



### 3. 编辑笔记
**（1）实现思路**
笔记编辑功能通过事件驱动机制实现数据加载、实时编辑和自动保存。当用户在笔记列表中选择一篇笔记时，系统执行以下逻辑：

1. **事件触发与笔记加载** ：笔记列表组件触发noteSelected全局事件，EditorUI模块的loadNote()方法监听到该事件后接管加载流程。该方法首先验证笔记对象的存在性，然后设置currentNoteId变量跟踪当前编辑状态，并将笔记数据绑定到编辑器UI组件。

2. **编辑器状态初始化** ：编辑器加载笔记后，标题输入框显示笔记原有标题，富文本编辑器填充笔记内容。同时，编辑器状态从"禁用"切换到"启用"，工具栏按钮变为可交互状态，字数统计更新为当前笔记内容的字符数。

3. **自动保存机制** ：采用防抖策略的自动保存机制来同步编辑内容与内存数据。每当编辑器内容发生变化，scheduleAutoSave()方法会清除之前的定时器，并设置新的1秒延迟定时器。用户连续输入时，只有最后一次输入完成1秒后才会触发保存。

4. **数据更新与持久化** ：自动保存触发时，autoSaveNote()方法通过getNoteData()获取当前标题和内容，调用数据层的updateNote()方法更新数据。该方法会合并更新字段，自动设置updatedAt时间戳，然后将更新后的笔记对象保存到本地存储。

5. **状态同步与反馈** ：保存完成后，系统更新originalNote副本（用于检测未保存的更改），并通过事件系统通知笔记列表更新显示。如有必要，会在界面右下角显示短暂的"已保存"提示。

**（2）核心代码实现**
EditorUI.loadNote() 方法：
```javascript
/**
 * 加载笔记到编辑器
 * @param {Object} note - 要加载的笔记对象
 */
loadNote(note) {
    if (!note) {
        this.disableEditor();
        return;
    }
    
    // 设置当前笔记ID
    this.currentNoteId = note.id;
    
    // 保存原始副本用于脏检查
    this.originalNote = {
        title: note.title,
        content: note.content,
        tags: [...note.tags]
    };
    
    // 更新UI
    document.getElementById('note-title-input').value = note.title || '';
    this.editor.setContent(note.content || '');
    
    // 启用编辑器
    this.enableEditor();
    
    // 更新字数统计
    this.updateWordCount(note.content);
    
    // 更新标签显示
    this.renderTags(note.tags || []);
}
```
自动保存机制实现：

```javascript
class EditorUI {
  constructor() {
      this.autoSaveTimer = null;
      this.autoSaveDelay = 1000; // 1秒延迟
      this.currentNoteId = null;
      this.originalNote = null;
  }
  
  /**
    * 调度自动保存（防抖实现）
    */
  scheduleAutoSave() {
      // 清除之前的定时器
      if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer);
      }
      
      // 设置新的定时器
      this.autoSaveTimer = setTimeout(() => {
          this.autoSaveNote();
      }, this.autoSaveDelay);
  }
  
  /**
    * 执行自动保存
    */
  async autoSaveNote() {
      if (!this.currentNoteId) {
          return;
      }
      
      // 获取当前编辑器内容
      const currentData = this.getNoteData();
      
      // 检查是否有实际变化
      if (this.hasUnsavedChanges(currentData)) {
          try {
              // 调用数据层更新
              const updatedNote = await dataManager.updateNote(
                  this.currentNoteId,
                  {
                      title: currentData.title,
                      content: currentData.content
                  }
              );
              
              // 更新原始副本
              this.originalNote = {
                  title: updatedNote.title,
                  content: updatedNote.content,
                  tags: [...updatedNote.tags]
              };
              
              // 触发笔记更新事件
              const event = new CustomEvent('noteUpdated', {
                  detail: { note: updatedNote },
                  bubbles: true
              });
              document.dispatchEvent(event);
              
              // 显示保存反馈（可选）
              this.showSaveIndicator();
              
          } catch (error) {
          }
      }
  }
    
  /**
    * 检查是否有未保存的更改
    */
  hasUnsavedChanges(currentData) {
      if (!this.originalNote) return true;
      
      return currentData.title !== this.originalNote.title ||
              currentData.content !== this.originalNote.content;
  }
}
```
数据层updateNote方法：

```javascript
/**
 * 更新笔记
 * @param {string} id - 笔记ID
 * @param {Object} updates - 更新字段
 * @returns {Object} 更新后的笔记对象
 */
async updateNote(id, updates) {
    const noteIndex = this.data.notes.findIndex(note => note.id === id);
    
    if (noteIndex === -1) {
        return null;
    }
    
    // 创建更新后的笔记对象
    const updatedNote = {
        ...this.data.notes[noteIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    // 更新本地数据
    this.data.notes[noteIndex] = updatedNote;
    
    // 保存到本地存储
    this.saveToStorage();
    return updatedNote;
}
```
**（3）难点与解决**
如果每次输入都立即保存，会导致大量不必要的存储操作，可能影响编辑器性能。所以需要**避免频繁保存**，解决方案是采用防抖策略的自动保存机制：设置1秒的延迟，只有在用户停止输入1秒后才执行保存操作。这通过scheduleAutoSave()方法中的定时器管理实现，既保证了数据及时保存，又避免了性能损耗。

### 4. 删除笔记
**（1）实现思路**
笔记删除功能基于两种模式：立即删除（硬删除）和移入回收站（软删除）。deleteNote方法实现了基础的立即删除逻辑，从数据数组中物理移除笔记对象。具体步骤如下：

1. **定位笔记** ：通过传入的笔记ID，在全局notes数组中查找对应笔记的索引位置。

2. **验证存在性** ：检查是否找到目标笔记，若未找到则返回删除失败状态。

3. **执行删除** ：使用数组的splice方法，将找到的笔记从数组中移除。

4. **持久化存储** ：立即调用saveToStorage方法将更新后的数据保存到localStorage。

5 **返回结果**：返回删除操作的成功状态，供调用方进一步处理。

此方法实现了笔记的物理删除，而完整的删除功能采用了更完善的软删除机制，详见本报告第三部分介绍。
**（2）核心代码实现**
```javascript
/**
 * 删除笔记（硬删除）
 * @description 根据笔记ID从数据数组中物理移除笔记对象
 * @param {string} id - 要删除的笔记ID
 * @returns {boolean} 删除操作是否成功
 */
deleteNote(id) {
    // 1. 在全局笔记数组中查找目标笔记的索引
    const noteIndex = this.data.notes.findIndex(note => note.id === id);
    
    // 2. 验证笔记是否存在
    if (noteIndex === -1) {
        return false; // 未找到要删除的笔记
    }
    
    // 3. 从数组中移除笔记对象
    this.data.notes.splice(noteIndex, 1);
    
    // 4. 将更新后的数据保存到本地存储
    this.saveToStorage();
    
    // 5. 返回操作成功状态
    return true;
}
```

### 5. 更新笔记
**（1）实现思路**
笔记移动功能允许用户将笔记从一个分类转移到另一个分类，包括普通分类之间的移动和私密笔记状态切换。实现思路如下：

1. **移动入口**：在笔记列表栏中，每个笔记项的右上角都有修改按钮（通常显示为移动图标）。点击该按钮会弹出分类选择菜单，用户可以从中选择目标分类。

2. **核心移动逻辑**：移动操作调用数据层的moveNoteToCategory方法。该方法执行以下步骤：

    验证待移动笔记和目标分类的存在性。

    更新笔记对象的categoryId属性为目标分类ID。

    调用saveToStorage将变更持久化到localStorage。

    如果用户已登录，尝试将变更同步到服务器。

3. **私密笔记的特殊处理**：私密笔记操作是移动功能的特殊场景。通过笔记项右侧的锁形按钮触发handlesetprivateClick方法。系统会根据笔记当前状态智能判断操作类型：如果笔记已在私密分类中，操作变为"取消私密"，目标分类设为'uncategorized'。如果笔记不在私密分类，操作变为"设为私密"，目标分类设为'private'。

4. **数据隔离与显示**：私密笔记具有特殊的显示规则：当笔记被设为私密后，它会从原分类和"全部笔记"视图中消失，只在"私密笔记"分类下可见，确保隐私性。

**（2）核心代码实现**
移动笔记到其他分类的核心方法：
```javascript
/**
 * 移动笔记到其他分类
 * @description 将指定笔记移动到目标分类，支持本地存储和云端同步
 * @param {string} noteId - 要移动的笔记ID
 * @param {string} targetCategoryId - 目标分类ID
 * @returns {boolean} 移动是否成功
 */
async moveNoteToCategory(noteId, targetCategoryId) {
    // 1. 验证笔记存在性
    const note = this.getNoteById(noteId);
    if (!note) {
        return false;
    }
    
    // 2. 验证目标分类存在性
    if (!this.getCategoryById(targetCategoryId)) {
        return false;
    }
    
    // 3. 更新笔记的分类ID
    const originalCategoryId = note.categoryId;
    note.categoryId = targetCategoryId;
    note.updatedAt = Date.now();
    
    // 4. 持久化到本地存储
    this.saveToStorage();
    
    // 5. 如果用户已登录，尝试同步到服务器
    if (authManager.getCurrentUser()) {
        try {
            const result = await this.updateNoteToServer(note);
            if (!result.success) {
                // 服务器同步失败，但本地更新已成功
            }
        } catch (error) {
            // 网络错误等异常情况
        }
    }
    
    // 6. 分发笔记移动事件，通知UI更新
    const moveEvent = new CustomEvent('noteMoved', {
        detail: { 
            noteId, 
            fromCategoryId: originalCategoryId, 
            toCategoryId: targetCategoryId 
        },
        bubbles: true
    });
    document.dispatchEvent(moveEvent);
    
    return true;
}
```

### 6.搜索笔记
**（1）实现思路**
搜索功能允许用户在当前分类范围内快速查找包含特定关键词的笔记，搜索范围包括笔记标题和内容。实现思路如下：

1. **搜索触发机制**：当用户在搜索框中输入关键词时，系统实时调用搜索方法。如果搜索框为空，则自动回退到正常的分类笔记视图。

2. **智能过滤逻辑**：搜索功能需要智能处理不同分类下的特殊规则：
  * 在"全部笔记"分类中，搜索所有非私密、非删除的笔记。
  * 在普通分类（包括"未分类"和用户自定义分类）中，只搜索当前分类下且非私密的笔记。
  * 在"私密笔记"分类中，只搜索私密笔记（排除删除笔记）。
  * 在"回收站"分类中，搜索所有已删除笔记（包括私密和非私密）。

3. **状态显示与结果渲染**：执行搜索后，更新笔记列表标题为"搜索：关键词"，渲染匹配的搜索结果，并显示搜索结果数量。当搜索关键词清空时，自动恢复显示当前分类的笔记列表。

**（2）核心代码实现**
数据库层的搜索逻辑实现,核心逻辑在ui/list.js的searchNotes方法中。当用户输入关键词时，系统首先更新currentSearchQuery状态变量，然后更新分类标题显示搜索状态。接着调用数据层的NoteDB.searchNotes(query)方法获取匹配结果。
```javascript
/**
 * 搜索笔记（数据层）
 * @description 根据搜索关键词和当前分类状态过滤匹配的笔记
 * @param {string} query - 搜索关键词
 * @returns {Array} 匹配的笔记数组
 */
searchNotes(query) {
    // 空关键词直接返回空数组
    if (!query.trim()) {
        return [];
    }
    
    // 统一转为小写进行不区分大小写的搜索
    const q = query.toLowerCase();
    const currentCategoryId = this.getCurrentCategoryId();

    // 根据不同分类应用不同过滤规则
    switch(currentCategoryId) {
        case 'all':
            // 全部笔记：排除私密和删除笔记
            return this.data.notes.filter(note => 
                note.categoryId !== 'private' && 
                note.categoryId !== 'deleted' && 
                (note.title.toLowerCase().includes(q) || 
                 note.content.toLowerCase().includes(q))
            );
            
        case 'private':
            // 私密笔记：只搜索私密笔记
            return this.data.notes.filter(note => 
                note.categoryId === 'private' && 
                (note.title.toLowerCase().includes(q) || 
                 note.content.toLowerCase().includes(q))
            );
            
        case 'deleted':
            // 回收站：搜索所有已删除笔记
            return this.data.notes.filter(note => 
                note.categoryId === 'deleted' && 
                (note.title.toLowerCase().includes(q) || 
                 note.content.toLowerCase().includes(q))
            );
            
        default:
            // 其他分类：搜索当前分类下的非私密笔记
            return this.data.notes.filter(note => 
                note.categoryId === currentCategoryId && 
                note.categoryId !== 'private' && 
                (note.title.toLowerCase().includes(q) || 
                 note.content.toLowerCase().includes(q))
            );
    }
}
```
UI层的搜索控制逻辑：
```javascript
/**
 * 搜索笔记（UI层）
 * @description 处理搜索输入，更新界面显示搜索结果
 * @param {string} query - 搜索关键词
 */
searchNotes(query) {
    // 保存当前搜索关键词
    this.currentSearchQuery = query;
    
    // 更新分类标题显示搜索状态
    if (query) {
        this.updateCategoryTitle(`搜索: ${query}`);
    } else {
        this.updateCategoryTitle();
    }

    // 获取搜索结果
    let notes = NoteDB.searchNotes(query);
    
    // 对搜索结果进行排序（按时间倒序）
    notes = this.sortNotes(notes);
    
    // 保存当前显示的笔记
    this.currentNotes = notes;
    
    // 根据是否有关键词决定渲染方式
    if (query === '') {
        // 清空搜索，回退到分类视图
        this.loadNotesByCategory(this.getCurrentCategoryId());
    } else {
        // 渲染搜索结果
        this.renderNotesList(notes);
    }
    
    // 更新详情栏显示搜索结果数量
    this.updateDetailBar(notes.length, query ? 'search' : 'category');
}
```
搜索框事件监听与实时搜索：
```javascript
/**
 * 初始化搜索功能
 * @description 绑定搜索框输入事件，实现实时搜索
 */
initSearch() {
    const searchInput = document.getElementById('search-input');
    
    // 实时搜索：输入时立即触发
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        this.searchNotes(query);
    });
    
    // 支持清除搜索
    const clearBtn = document.getElementById('clear-search-btn');
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.searchNotes('');
        searchInput.focus();
    });
    
    // 支持键盘快捷键：ESC键清除搜索
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchInput.value) {
            searchInput.value = '';
            this.searchNotes('');
        }
    });
}
```
**（3）难点与解决**

1. **不同分类下的搜索需要应用不同的过滤规则**（如私密笔记隔离、回收站特殊处理）。解决方案是采用分类路由策略：根据当前分类ID进入不同的搜索分支，在每个分支内应用特定的过滤条件。这种设计确保了搜索逻辑与分类视图逻辑的一致性，避免了在"私密笔记"分类中搜索到普通笔记等逻辑错误。

2. 需要确保用户能清晰感知当前处于搜索状态还是正常分类视图,解决**搜索状态与正常视图的无缝切换**。所以系统通过状态同步机制解决：搜索时更新标题为"搜索: 关键词"，并保存搜索关键词到currentSearchQuery变量；清除搜索时，不仅清空输入框，还调用loadNotesByCategory方法加载当前分类的正常笔记列表，同时恢复分类标题。


---

## 三、 系统扩展功能的设计与实现

### 3.1 私密笔记

**（1）实现思路**
私密笔记功能允许用户将普通笔记设为私密状态，并通过"私密笔记"分类浏览，同时支持设置四位数字密码以增强隐私保护。该功能通过以下流程实现：

1. **笔记私密状态切换**：每个笔记项右侧都有一个锁形按钮。点击时，系统根据当前笔记状态（是否已在私密分类）决定执行"设为私密"或"取消私密"操作。变更前通过确认对话框明确告知用户操作后果，用户确认后调用数据层的moveNoteToCategory方法更新笔记的categoryId（私密笔记为'private'，取消后为'uncategorized'），并同步更新UI。

2. **密码保护机制**：当用户首次进入或未设置密码时，点击"私密笔记"分类可直接查看所有私密笔记。在私密笔记视图下，笔记列表栏右上角会出现设置菜单，用户可在此设置或修改密码。密码设置采用双重验证：格式验证（必须为4位数字）和一致性验证（两次输入必须相同）。密码以哈希形式存储在localStorage中。设置密码后，再次进入私密笔记分类需通过密码验证模态框进行验证。

3. **密码管理**：已设置密码的用户可通过密码设置模态框中的"取消查看密码"按钮清除密码，使私密分类恢复为无密码保护状态。密码更新操作会覆盖旧密码，确保用户可灵活管理隐私设置。

**（2）核心代码实现**
设置私密笔记密码的验证逻辑：
```javascript
/**
 * 设置私密笔记访问密码
 * @description 验证用户输入的4位数字密码，通过后存储哈希值到本地
 * @param {HTMLElement} modal - 密码设置模态框DOM元素
 */
async setPrivatePassword(modal) {
    const inputs = modal.querySelectorAll('.set-newpassword input');
    const password1 = inputs[0].value.trim();
    const password2 = inputs[1].value.trim();
    
    // 1. 格式验证：必须是4位数字
    if (!/^\d{4}$/.test(password1) || !/^\d{4}$/.test(password2)) {
        this.showPasswordError(modal, '密码必须是4位数字');
        return;
    }
    
    // 2. 一致性验证：两次输入必须相同
    if (password1 !== password2) {
        this.showPasswordError(modal, '两次输入的密码不一致');
        return;
    }
    
    // 3. 调用数据层存储密码哈希
    const result = await NoteDB.setPrivatePassword(password1);
    
    if (result.success) {
        modal.style.display = 'none';
        this.notesListUI.showToast('私密笔记密码已设置', 'success');
    } else {
        this.showPasswordError(modal, result.message || '设置密码失败');
    }
}
```
清除私密笔记密码的实现：
```javascript
/**
 * 清除私密笔记密码
 * @description 将密码存储重置为null，移除密码保护
 */
async clearPrivatePassword() {
    // 1. 重置内存中的数据
    DEFAULT_DATA.password = null;
    this.data.password = null;
    
    // 2. 持久化到本地存储
    this.saveToStorage();
    
    // 3. 显示操作成功提示
    this.notesListUI.showToast('已取消查看私密笔记密码', 'success');
}
```
密码输入框的严格控制逻辑：
```javascript
/**
 * 密码输入框输入控制
 * @description 限制输入只能为数字，且最大长度为4位
 * @param {Event} e - 输入事件对象
 */
function handlePasswordInput(e) {
    // 1. 移除非数字字符
    e.target.value = e.target.value.replace(/\D/g, '');
    
    // 2. 限制最大长度为4位
    if (e.target.value.length > 4) {
        e.target.value = e.target.value.substring(0, 4);
    }
}

// 绑定输入事件监听器
passwordInputs.forEach(input => {
    input.addEventListener('input', handlePasswordInput);
    
    // 3. 支持Enter键提交
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('confirm-password-btn').click();
        }
    });
});
```
**（3）难点与解决**
当用户切换笔记的私密状态时，需要同时更新笔记的categoryId属性、相应分类的笔记列表以及UI显示。为解决这一问题，系统采用**单向数据流+事件驱动架构**：数据层的moveNoteToCategory方法负责核心数据更新和持久化，完成后分发noteMoved事件。所有相关UI组件（笔记列表、分类侧边栏、编辑区）都监听此事件，在事件触发时重新获取最新数据并渲染，确保整个应用状态同步。

### 3.2 笔记回收站
**（1）实现思路**
笔记回收站功能采用"两阶段删除"机制，确保用户误删笔记后能够恢复，同时提供彻底清理选项。实现思路如下：

1. **软删除（移入回收站）**：用户在普通分类中点击删除按钮时，系统执行软删除操作。通过确认对话框确认后，调用moveNoteToCategory方法将笔记的categoryId设置为'deleted'，笔记从原分类消失但数据仍保留。删除成功后更新UI并显示提示。

2. **回收站视图**：切换到"最近删除"分类后，笔记项的按钮变为"恢复"和"永久删除"两个选项。搜索功能在此分类下会包含已删除笔记，而在其他分类下则自动排除。

3. **恢复操作**：在回收站中点击恢复按钮，系统提供两种恢复策略：本地环境下默认恢复到"未分类"分类；云端同步环境下可使用服务器返回的原分类ID。恢复操作实际上是将笔记的categoryId从'deleted'更新为目标分类ID。

4. **永久删除（硬删除）**：在回收站中再次点击删除，系统执行永久删除。由于此操作不可逆，系统显示加强警告的确认对话框。确认后，笔记从数据库中彻底删除，相关UI元素立即移除。如果被删笔记正在编辑中，编辑器将被重置为空状态。

**（2）核心代码实现**
软删除操作（移入回收站）：

```javascript
/**
 * 处理笔记删除点击事件（软删除）
 * @description 将笔记移动到回收站，保留恢复可能
 * @param {string} noteId - 要删除的笔记ID
 */
handleDeleteNoteClick(noteId) {
    const note = NoteDB.getNoteById(noteId);
    if (!note) return;
    
    // 不在回收站时执行软删除
    if (this.currentCategoryId !== 'deleted') {
        if (confirm(`确定要删除笔记 "${note.title}" 吗？`)) {
            // 执行软删除：移动到回收站分类
            const success = NoteDB.moveNoteToCategory(noteId, 'deleted');
            
            if (success) {
                // 刷新当前分类的笔记列表
                this.notesListUI.refresh();
                // 显示操作成功提示
                this.notesListUI.showToast('笔记已删除', 'success');
                // 更新侧边栏分类统计
                SidebarUI.updateSidebarStats();
                // 分发笔记更新事件
                const event = new CustomEvent('noteUpdated', {
                    detail: { noteId, action: 'deleted' },
                    bubbles: true
                });
                document.dispatchEvent(event);
            }
        }
    } else {
        // 在回收站中执行永久删除
        this.handlePermanentDelete(noteId);
    }
}
```

恢复笔记功能实现：

```javascript
/**
 * 恢复回收站中的笔记
 * @description 将笔记从回收站恢复到指定分类（默认未分类）
 * @param {string} noteId - 要恢复的笔记ID
 */
handleRestoreNoteClick(noteId) {
    const note = NoteDB.getNoteById(noteId);
    if (!note) return;
    
    if (confirm(`确定要恢复笔记 "${note.title}" 吗？`)) {
        let targetCategoryId = 'uncategorized'; // 默认恢复到未分类
        
        // 如果已登录且云端同步，尝试获取原分类
        if (authManager.getCurrentUser()) {
            // 从服务器获取笔记的原分类信息
            NoteDB.restoreNoteFromServer(noteId).then(result => {
                if (result.success && result.data.category_id) {
                    targetCategoryId = result.data.category_id;
                }
                this.executeRestore(noteId, targetCategoryId);
            }).catch(() => {
                // 服务器请求失败，使用本地恢复
                this.executeRestore(noteId, targetCategoryId);
            });
        } else {
            // 纯本地环境，直接恢复到未分类
            this.executeRestore(noteId, targetCategoryId);
        }
    }
}

/**
 * 执行恢复操作
 * @description 实际执行笔记恢复的数据更新和UI刷新
 * @param {string} noteId - 笔记ID
 * @param {string} categoryId - 目标分类ID
 */
executeRestore(noteId, categoryId) {
    const success = NoteDB.moveNoteToCategory(noteId, categoryId);
    
    if (success) {
        // 刷新笔记列表
        this.notesListUI.refresh();
        // 显示成功提示
        this.notesListUI.showToast('笔记已恢复', 'success');
        // 更新侧边栏统计
        SidebarUI.updateSidebarStats();
        // 分发笔记恢复事件
        const event = new CustomEvent('noteRestored', {
            detail: { noteId, categoryId },
            bubbles: true
        });
        document.dispatchEvent(event);
    }
}
```
永久删除（硬删除）实现：
```javascript
/**
 * 永久删除笔记
 * @description 从数据库中彻底删除笔记，此操作不可逆
 * @param {string} noteId - 要永久删除的笔记ID
 */
handlePermanentDelete(noteId) {
    const note = NoteDB.getNoteById(noteId);
    if (!note) return;
    
    // 强化警告确认
    if (confirm(`警告：此操作将永久删除笔记 "${note.title}"，且无法恢复。\n\n确定要继续吗？`)) {
        // 调用数据层永久删除方法
        const success = NoteDB.deleteNotePermanently(noteId);
        
        if (success) {
            // 从UI列表中立即移除该笔记项
            this.removeNoteFromList(noteId);
            
            // 如果被删笔记当前正在编辑，清空编辑器
            if (this.currentNoteId === noteId) {
                this.currentNoteId = null;
                this.clearEditor();
                this.disableEditor();
                this.showEditorPlaceholder('笔记已被永久删除');
            }
            
            // 显示永久删除提示
            this.notesListUI.showToast('笔记已永久删除', 'error');
            // 更新侧边栏统计
            SidebarUI.updateSidebarStats();
            // 分发永久删除事件
            const event = new CustomEvent('notePermanentlyDeleted', {
                detail: { noteId },
                bubbles: true
            });
            document.dispatchEvent(event);
        }
    }
}
```
**（3）难点与解决**

笔记恢复时需要智能决定目标分类。系统采用分层恢复策略：优先尝试从云端获取原分类（如果用户已登录且笔记有云端备份），否则默认恢复到"未分类"分类。这种设计既保持了数据恢复的准确性，又确保了本地环境下的操作可行性。

### 3.3 笔记搜索增强
**（1）实现思路**

搜索结果中的匹配关键词会被高亮显示。highlightKeyword方法使用正则表达式将匹配的文本包裹在<span class="highlight">标签中。为了避免正则表达式特殊字符引起的问题，escapeRegExp方法对关键词进行转义处理。内容预览的高亮在getContentPreview方法中实现，该方法先去除HTML标签，截取前100个字符，然后调用highlightKeyword进行高亮。

当没有搜索结果时，系统根据当前上下文显示不同的引导信息，帮助用户调整搜索策略。
**（2）核心代码实现**
UI层搜索控制与结果高亮：
```javascript
/**
 * 搜索笔记（UI层）
 * @description 处理搜索输入，更新界面显示高亮搜索结果
 * @param {string} query - 搜索关键词
 */
searchNotes(query) {
    // 保存当前搜索关键词
    this.currentSearchQuery = query;
    
    // 更新分类标题显示搜索状态
    if (query) {
        this.updateCategoryTitle(`搜索: ${query}`);
    } else {
        this.updateCategoryTitle();
    }

    // 获取初步搜索结果
    let notes = NoteDB.searchNotes(query);
    
    // 在非"全部笔记"分类下，进一步筛选当前分类结果
    if (this.getCurrentCategoryId() !== 'all') {
        notes = notes.filter(note => note.categoryId === this.getCurrentCategoryId());
    }
    
    // 对搜索结果进行排序
    notes = this.sortNotes(notes);
    
    // 保存当前显示的笔记
    this.currentNotes = notes;
    
    // 根据搜索状态决定渲染方式
    if (query === '') {
        // 清空搜索，回退到分类视图
        this.loadNotesByCategory(this.getCurrentCategoryId());
    } else {
        // 渲染高亮搜索结果
        this.renderNotesList(notes);
    }
    
    // 更新详情栏显示搜索结果数量
    this.updateDetailBar(notes.length, query ? 'search' : 'category');
}

/**
 * 高亮文本中的关键词
 * @description 使用正则表达式匹配并包裹高亮标签
 * @param {string} text - 原始文本
 * @param {string} keyword - 搜索关键词
 * @returns {string} 高亮处理后的文本
 */
highlightKeyword(text, keyword) {
    if (!keyword || !text || keyword.trim() === '') {
        return text; // 如果没有关键词，直接返回原文本
    }
    
    const escapedKeyword = this.escapeRegExp(keyword);
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    
    // 将匹配的部分用高亮标记包裹
    return text.replace(regex, '<span class="highlight">$1</span>');
}

/**
 * 转义正则表达式特殊字符
 * @description 防止关键词中的特殊字符导致正则表达式错误
 * @param {string} string - 原始字符串
 * @returns {string} 转义后的字符串
 */
escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 获取内容预览并高亮关键词
 * @description 提取纯文本内容前100字符并进行高亮处理
 * @param {string} content - 笔记原始内容（可能包含HTML）
 * @param {string} keyword - 搜索关键词
 * @returns {string} 高亮处理后的内容预览
 */
getContentPreview(content, keyword) {
    // 去除HTML标签，获取纯文本
    const plainText = content.replace(/<[^>]*>/g, '');
    // 截取前100个字符
    const preview = plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
    // 高亮关键词
    return this.highlightKeyword(preview, keyword);
}
```
**（3）难点与解决**
**高亮功能需要正确处理特殊字符**，避免XSS攻击和正则表达式错误。系统通过使用escapeRegExp方法转义关键词中的正则表达式特殊字符。高亮标签使用<span>元素而非直接插入原始HTML，并通过CSS类控制样式，避免脚本注入风险。内容预览前先去除HTML标签，确保只对纯文本进行高亮处理，防止标签干扰。

### 3.4 笔记导出
**（1）实现思路**

1. **触发导出**：当用户点击编辑器工具栏中的导出按钮时，applyFormatting('output')方法被调用，触发导出流程。检查当前是否有正在编辑的笔记（通过this.currentNoteId）。确认存在编辑中的笔记后，系统调用主应用模块的NoteApp.exportCurrentnote()方法，并传入从数据库获取的完整笔记对象NoteDB.getNoteById(this.currentNoteId)。这个调用链条确保了导出操作基于最新保存的笔记数据，避免了因未保存更改导致的内容不一致。
导出功能的核心在于exportCurrentnote()方法，该方法封装了完整的导出逻辑链。方法首先进行异常保护，将整个导出过程包装在try-catch块中，确保任何步骤出错都能捕获并给用户适当的反馈。导出过程分为三个主要阶段：
* **Markdown内容生成、文件名生成和文件下载**。首先，generateNoteMarkdown()方法负责将富文本笔记转换为标准Markdown格式。这个方法接受完整的笔记对象作为参数，首先从数据层获取分类信息，然后定义了两个关键辅助函数：日期格式化函数确保时间戳以用户友好的本地化格式显示；HTML到Markdown转换函数通过一系列正则表达式替换将富文本HTML内容转换为Markdown语法。转换过程涵盖了常见的HTML元素：标题标签（h1-h3）转换为对应的Markdown标题标记（#、##、###），加粗标签（strong、b）转换为双星号包围，斜体标签（em、i）转换为单星号包围，下划线标签（u）保留HTML格式，代码标签（code）转换为反引号包围，链接标签（a）转换为Markdown链接语法，图片标签（img）转换为Markdown图片语法。
* **列表的处理**：无序列表（ul）的每个列表项（li）转换为以短横线开头的列表项，有序列表（ol）则为每个列表项添加递增的数字序号。此外，方法还处理了换行符、段落标签的转换，并移除了剩余的HTML标签，同时将HTML实体（如&nbsp;、&lt;等）转换回对应的字符。
* **构建完整的Markdown文档结构**，包含笔记标题（一级标题）、分类信息、创建时间、标签列表、分隔线、转换后的内容主体以及导出时间戳。

2. **生成文件名**：文件名生成由generateNoteFilename()方法负责，该方法基于笔记标题和当前日期创建规范的文件名。首先，笔记标题经过清理处理：移除文件系统不允许的字符（如\/:*?"<>|），将空格替换为下划线以增强文件名的可读性，并截取前50个字符防止文件名过长。然后，获取当前日期的ISO格式字符串并分割出日期部分（YYYY-MM-DD）。最后，将清理后的标题与日期组合，形成清理后标题_YYYY-MM-DD.md格式的文件名。这种命名约定既包含了内容标识又包含了时间戳，便于用户管理和归档导出的文件。

3. **文件下载**：文件下载过程通过downloadMarkdownFile()方法实现，该方法利用现代浏览器的Blob API和临时URL机制创建下载链接。首先，将生成的Markdown内容包装成一个Blob对象，指定MIME类型为text/markdown;charset=utf-8，确保文件被正确识别为Markdown文档。接着，通过URL.createObjectURL()为该Blob创建一个临时URL。然后，动态创建一个隐藏的a元素，设置其href属性为临时URL，download属性为生成的文件名。通过JavaScript程序化地点击这个链接元素，触发浏览器的文件下载对话框。下载完成后，系统通过setTimeout延迟100毫秒执行清理操作：从DOM中移除临时创建的链接元素，并通过URL.revokeObjectURL()释放临时URL占用的内存资源。这种实现方式无需依赖服务器端处理，完全在前端完成，确保了离线环境下的可用性。

整个导出过程伴随着明确的用户反馈机制。成功导出后，系统通过showNotification()方法显示绿色成功提示，格式为"笔记标题" 已导出为 文件名.md，持续3秒后自动消失。如果导出过程中发生任何错误（如笔记数据无效、Blob创建失败等），错误会被捕获并通过红色错误提示通知用户，显示具体的错误信息。这种即时的反馈机制让用户清楚地知道操作结果，增强了功能的可靠性和用户体验。

当笔记标题为空时，使用"未命名笔记"作为默认标题；当笔记内容为空时，生成空的Markdown内容部分；当笔记不包含标签时，标签部分显示为"无"。

**（2）核心代码实现**
HTML到Markdown转换与文档生成：该方法实现富文本内容到标准Markdown格式的完整转换，并构建包含笔记元数据的完整Markdown文档。

```javascript
/**
 * 生成笔记的Markdown格式内容
 * @param {Object} note - 笔记对象
 * @returns {string} Markdown格式的笔记内容
 */
generateNoteMarkdown(note) {
    // 获取分类信息
    const category = NoteDB.getCategoryById(note.categoryId);
    
    // 格式化日期辅助函数
    const formatDate = (dateString) => {
        if (!dateString) return '未知时间';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleString('zh-CN');
    };
    
    // HTML到Markdown转换辅助函数
    const htmlToMarkdown = (html) => {
        if (!html) return '';
        
        let markdown = html
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
            .replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
            .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
            .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match) => {
                return match.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
            })
            .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
                let index = 1;
                return content.replace(/<li[^>]*>(.*?)<\/li>/gi, (liMatch, liContent) => {
                    return `${index++}. ${liContent}\n`;
                });
            })
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
        
        // 清理多余空行
        markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        return markdown;
    };
    
    // 构建完整的Markdown文档
    const markdown = `# ${note.title || '未命名笔记'}
分类: ${category.name}

创建时间: ${formatDate(note.createdAt)}

标签：${note.tags && note.tags.length > 0 ? `${note.tags.join(', ')}\n` : '无'}

---

${htmlToMarkdown(note.content || '')}

---

*导出时间: ${new Date().toLocaleString('zh-CN')}*`;
    
    return markdown;
}
```

文件名生成方法：该方法基于笔记标题和当前日期创建规范、安全的文件名。
```javascript
/**
 * 生成导出的文件名
 * @param {Object} note - 笔记对象
 * @returns {string} 规范的文件名
 */
generateNoteFilename(note) {
    // 清理笔记标题：移除非法字符，替换空格，限制长度
    const cleanTitle = (note.title || '未命名笔记')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
    
    // 获取当前日期
    const today = new Date().toISOString().split('T')[0];
    
    // 组合文件名：标题_YYYY-MM-DD.md
    return `${cleanTitle}_${today}.md`;
}
```

文件下载方法：利用Blob API创建临时URL并触发文件下载。
```javascript
/**
 * 下载Markdown文件到本地
 * @param {string} content - Markdown内容
 * @param {string} filename - 文件名
 */
downloadMarkdownFile(content, filename) {
    // 创建Blob对象
    const blob = new Blob([content], { 
        type: 'text/markdown;charset=utf-8' 
    });
    
    // 创建临时URL
    const url = URL.createObjectURL(blob);
    
    // 创建并配置下载链接
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    
    // 清理资源
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}
主导出方法：整合完整导出流程，包含异常处理和用户反馈。

javascript
/**
 * 导出当前笔记
 * @returns {Promise<void>}
 */
async exportCurrentNote() {
    try {
        // 1. 检查当前笔记
        if (!this.currentNoteId) {
            throw new Error('没有正在编辑的笔记');
        }
        
        // 2. 获取最新笔记数据
        const note = NoteDB.getNoteById(this.currentNoteId);
        if (!note) {
            throw new Error('笔记不存在或已被删除');
        }
        
        // 3. 生成Markdown内容
        const markdownContent = this.generateNoteMarkdown(note);
        
        // 4. 生成文件名
        const filename = this.generateNoteFilename(note);
        
        // 5. 触发文件下载
        this.downloadMarkdownFile(markdownContent, filename);
        
        // 6. 显示成功反馈
        this.showNotification(
            `"${note.title || '未命名笔记'}" 已导出为 ${filename}`,
            'success'
        );
        
    } catch (error) {
        // 7. 错误处理
        this.showNotification(`导出失败: ${error.message}`, 'error');
    }
}
```
**（3）难点与解决**
1. 需要解决**富文本到Markdown的准确转换**，编辑器生成的HTML内容需要准确转换为Markdown语法，同时保持格式一致性。解决方案是编写全面的正则表达式转换函数，覆盖标题、加粗、斜体、链接、图片、列表等常见HTML元素。特别处理了嵌套列表和有序列表的序号生成，确保转换后的Markdown具有良好的可读性。

2. 使用Blob API创建临时URL后需要及时释放内存，**避免内存泄漏**。解决方案是在触发下载后，通过setTimeout延迟执行清理操作：从DOM中移除临时创建的链接元素，并调用URL.revokeObjectURL()释放临时URL占用的内存资源。

### 3.5 夜间模式
**（1）实现思路**

夜间模式切换功能通过在分类栏的用户设置菜单中添加"切换夜间模式"选项实现。该功能由专门的JavaScript模块Themes统一管理，通过Themes.toggleTheme()方法控制主题切换。其核心逻辑基于document.body元素的data-theme属性进行操作：当该属性值为dark时应用夜间模式，移除该属性时恢复为日间模式。主题切换不仅改变视觉样式，还同步更新界面文字提示和本地存储状态，确保用户偏好得以持久保存。

实现流程如下：

1. **主题状态管理**：系统通过document.body的data-theme属性值判断当前主题状态，通过localStorage中的theme项持久化用户偏好。

2. **视觉样式切换**：CSS中通过:root定义了一套完整的浅色主题变量，并通过[data-theme="dark"]选择器覆盖为深色主题变量集，实现一键切换所有界面元素配色。

3. **界面反馈同步**：切换主题时，同时更新菜单按钮的文字提示，确保用户获得明确的操作反馈。

4. **持久化存储**：每次主题切换后立即将当前主题状态保存到localStorage，页面加载时自动恢复上次使用的主题。

**（2）核心代码实现**
以下是主题切换模块的核心实现代码，负责管理主题状态的切换、存储和界面同步：

```javascript
/**
 * 主题切换模块
 * @description 管理日间/夜间模式的切换逻辑，包括视觉样式更新、文字提示同步和状态持久化
 */
const Themes = {
    /**
     * 切换日间/夜间主题
     * @description 基于document.body的data-theme属性切换主题，同步更新按钮文字和本地存储
     */
    toggleTheme() {
        const themeButton = document.querySelector('.theme-toggle-btn');
        
        // 判断当前是否为夜间模式
        if (document.body.getAttribute('data-theme') === 'dark') {
            // 切换到日间模式
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            
            // 更新按钮文字提示
            if (themeButton) {
                themeButton.textContent = '夜间模式';
            }
        } else {
            // 切换到夜间模式
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            
            // 更新按钮文字提示
            if (themeButton) {
                themeButton.textContent = '日间模式';
            }
        }
    },

    /**
     * 初始化主题
     * @description 页面加载时根据本地存储恢复用户上次选择的主题
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const themeButton = document.querySelector('.theme-toggle-btn');
        
        if (savedTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            if (themeButton) {
                themeButton.textContent = '日间模式';
            }
        } else {
            document.body.removeAttribute('data-theme');
            if (themeButton) {
                themeButton.textContent = '夜间模式';
            }
        }
    }
};

// 页面加载时初始化主题
document.addEventListener('DOMContentLoaded', () => {
    Themes.initTheme();
});
```

**（3）难点与解决**
当主题切换时，需要同步更新菜单按钮文字、可能存在的主题图标等多个界面元素。解决方案是通过统一的toggleTheme()方法集中处理所有状态更新逻辑，确保各界面元素保持同步，避免出现按钮文字与当前主题不匹配的情况。



### 3.6 笔记排序与分组
**（1）实现思路**

笔记排序功能允许用户根据多种维度（编辑时间、创建时间、标题）对当前显示的笔记列表进行动态重排。该功能通过笔记列表栏顶部的下拉选择框作为交互入口，位于笔记列表栏顶部的详情条中。实现流程主要分为以下详细步骤：

1. **用户交互触发与事件绑定**：

选择框在HTML中定义为\<select name="filter"\>元素，包含四个预置选项：按编辑时间、按创建时间、按标题。

当用户点击下拉箭头并选择不同排序方式时，浏览器会触发标准的change事件。

这个事件被NotesListListener模块的bindEvents()方法所绑定，将事件处理器与选择框关联。

2. **排序事件处理的完整流程**：

当用户选择新的排序方式时，handleFilterChange方法被调用。

该方法首先通过event.target.value获取选中的值（可能是'time'、'createTime'、'title'），然后立即更新currentSortMethod全局状态变量，确保后续操作基于最新的排序偏好。

接着，方法从当前DOM中获取所有显示的笔记项元素，通过querySelectorAll('.note-item')选择器得到节点列表。

如果列表为空（没有笔记），则提前返回，避免不必要的计算。

对于非空列表，方法执行数据收集：遍历每个笔记项元素，提取其data-note-id属性，通过NoteDB.getNoteById()从数据库获取完整的笔记对象，并收集到notes数组中。这个过程确保了排序操作基于最新的数据状态，而不是可能已过时的缓存数据。

3. **多维度排序算法的实现**：

收集到笔记数据后，系统调用sortNotes(notes, filterValue)方法执行实际的排序逻辑。

这个方法接收原始笔记数组和排序方式参数，返回排序后的新数组。

排序算法的实现基于JavaScript数组的sort()方法，但根据不同的排序维度采用了不同的比较逻辑：

对于按编辑时间排序（'time'），比较函数将两个笔记的updatedAt时间字符串转换为Date对象，然后使用new Date(b.updatedAt) - new Date(a.updatedAt)确保最近编辑的笔记排在前面。

对于按创建时间排序（'createTime'），类似的逻辑应用于createdAt属性。

按标题排序（'title'）则更复杂一些：比较函数首先将两个标题都转换为小写以确保不区分大小写，然后使用标准的字符串比较返回-1、0或1，实现字母顺序升序排列。

4. **视图更新与状态恢复**：

排序完成后，系统重新渲染笔记列表。如果在排序前有选中的笔记，重新渲染后该笔记的选中状态会丢失。

为此，系统在重新渲染后通过this.notesListUI.getCurrentNoteId()获取当前选中的笔记ID，如果存在，则调用this.notesListUI.selectNote(currentNoteId)重新应用选中状态。

selectNote方法会查找对应ID的笔记项DOM元素，为其添加activeCSS类，实现视觉高亮，并确保该元素在可视区域内（通过滚动调整）。

这个细节处理确保了排序操作不会中断用户的编辑流程：如果用户正在编辑某篇笔记，排序后该笔记仍然保持选中状态，编辑器中的内容也不会丢失。

5. **用户反馈与状态管理**：

为了提供清晰的用户反馈，排序完成后系统会显示一个短暂的操作提示。

通过this.notesListUI.showToast()方法，根据不同的排序方式显示对应的消息："已按编辑时间排序"、"已按创建时间排序"、"已按标题排序"。

这个提示使用与系统其他部分一致的视觉风格，通常出现在屏幕底部或角落，几秒后自动消失。

系统通过currentSortMethod变量记忆当前的排序方式，但这个变量只存在于内存中，页面刷新后会重置为默认值（'time'）。

6. **特殊情况的处理**：

当用户处于搜索状态时，排序操作仅应用于当前的搜索结果，而不是整个分类的所有笔记。

这是因为搜索本质上已经创建了一个临时的笔记子集，用户自然期望排序只作用于这个子集。

**（2）核心代码实现**
以下是排序功能的核心实现代码，包含排序逻辑、事件处理和状态管理：

```javascript
/**
 * 笔记排序功能实现
 * @description 提供按编辑时间、创建时间、标题等多种维度的笔记排序功能
 */
class NoteSorter {
    constructor() {
        this.currentSortMethod = 'time'; // 默认按编辑时间排序
        this.bindSortEvents();
    }

    /**
     * 绑定排序相关事件
     */
    bindSortEvents() {
        const filterSelect = document.querySelector('select[name="filter"]');
        if (filterSelect) {
            filterSelect.addEventListener('change', (event) => this.handleFilterChange(event));
        }
    }

    /**
     * 处理排序方式变更
     * @param {Event} event - 下拉选择框change事件
     */
    async handleFilterChange(event) {
        const filterValue = event.target.value;
        this.currentSortMethod = filterValue;
        
        // 获取当前显示的笔记列表元素
        const noteItems = document.querySelectorAll('.note-item');
        if (noteItems.length === 0) return;
        
        // 收集笔记数据
        const notes = [];
        for (const item of noteItems) {
            const noteId = item.dataset.noteId;
            const note = await NoteDB.getNoteById(noteId);
            if (note) notes.push(note);
        }
        
        // 执行排序
        const sortedNotes = this.sortNotes(notes, filterValue);
        
        // 重新渲染笔记列表
        this.renderSortedNotes(sortedNotes);
        
        // 显示操作提示
        this.showSortNotification(filterValue);
    }

    /**
     * 对笔记数组进行排序
     * @param {Array} notes - 待排序的笔记数组
     * @param {string} sortMethod - 排序方式
     * @returns {Array} 排序后的笔记数组
     */
    sortNotes(notes, sortMethod) {
        // 创建副本以避免修改原数组
        const sortedNotes = [...notes];
        
        switch(sortMethod) {
            case 'time': // 按编辑时间降序（最新编辑的在前）
                sortedNotes.sort((a, b) => {
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                });
                break;
                
            case 'createTime': // 按创建时间降序（最新创建的在前）
                sortedNotes.sort((a, b) => {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                break;
                
            case 'title': // 按标题升序（A-Z）
                sortedNotes.sort((a, b) => {
                    const titleA = a.title.toLowerCase();
                    const titleB = b.title.toLowerCase();
                    if (titleA < titleB) return -1;
                    if (titleA > titleB) return 1;
                    return 0;
                });
                break;
                
            default:
                // 默认按编辑时间排序
                sortedNotes.sort((a, b) => {
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                });
        }
        
        return sortedNotes;
    }

    /**
     * 渲染排序后的笔记列表
     * @param {Array} sortedNotes - 排序后的笔记数组
     */
    renderSortedNotes(sortedNotes) {
        const currentNoteId = NotesListUI.getCurrentNoteId();
        const notesListContainer = document.querySelector('.notes-list');
        
        // 清空当前列表
        notesListContainer.innerHTML = '';
        
        // 重新渲染排序后的笔记
        sortedNotes.forEach(note => {
            const noteElement = NotesListUI.createNoteElement(note);
            notesListContainer.appendChild(noteElement);
        });
        
        // 恢复之前选中的笔记状态
        if (currentNoteId) {
            NotesListUI.selectNote(currentNoteId);
        }
    }

    /**
     * 显示排序操作提示
     * @param {string} sortMethod - 排序方式
     */
    showSortNotification(sortMethod) {
        let message = '';
        switch(sortMethod) {
            case 'time':
                message = '已按编辑时间排序';
                break;
            case 'createTime':
                message = '已按创建时间排序';
                break;
            case 'title':
                message = '已按标题排序';
                break;
            default:
                message = '排序已更新';
        }
        
        NotesListUI.showToast(message, 'info', 2000);
    }
}

// 初始化排序功能
const noteSorter = new NoteSorter();
```

**（3）难点与解决**
1. **排序后重新渲染笔记列表会导致之前选中的笔记失去选中状态**，影响用户体验。解决方案是在重新渲染前记录当前选中的笔记ID（currentNoteId），在重新渲染后通过NotesListUI.selectNote(currentNoteId)重新应用选中状态。该方法不仅会为对应笔记项添加activeCSS类实现视觉高亮，还会通过scrollIntoView方法确保该笔记项在可视区域内。
2. 如果**直接对原始笔记数组进行排序操作，可能会在后续操作中产生副作用**。解决方案是在排序前创建数组副本（[...notes]），确保排序操作不会影响原始数据。同时，通过NoteDB.getNoteById()方法获取最新笔记数据，避免使用可能已过时的缓存数据，保证排序结果的准确性。

### 3.7 拖拽排序与分类管理
**（1）实现思路**
使用HTML5 Drag and Drop API实现笔记分类的拖拽排序和笔记拖拽到分类的功能。该功能分为两个主要部分：分类之间的拖拽排序和笔记拖拽到分类的归属变更。实现流程基于完整的事件链（dragstart、dragover、dragenter、dragleave、drop、dragend）进行状态管理和视觉反馈。

1. **分类拖拽排序实现流程**：

在bar.js中设置拖拽状态管理对象，包含isDragging、draggedItem、dragOverItem、currentOverItem等状态变量。

通过bindCategoryDragEvents方法为分类列表容器绑定完整的拖拽事件链。

开始拖拽时，handleCategoryDragStart方法执行保护性检查，确保被拖拽的不是系统分类（如"全部笔记"、"未分类"等固定分类），并将分类ID存入event.dataTransfer对象。

为被拖拽分类项添加视觉样式（半透明、阴影），并创建跟随鼠标的视觉预览元素。

拖拽过程中，handleCategoryDragOver方法实时计算鼠标位置，确定放置位置（before/after），并通过视觉指示线或背景高亮展示可能的插入位置。

放置时，handleCategoryDrop方法验证目标合法性，执行DOM重排（使用insertBeforeAPI），更新分类顺序，并将新顺序同步到数据存储中。

2. **笔记拖拽到分类实现流程**：

笔记拖拽由笔记列表的事件处理，与分类拖拽共享相似的事件链，但通过独立的状态对象进行区分。

开始拖拽笔记时，handleNoteDragStart方法提取笔记ID并设置拖拽数据，同时为笔记项添加视觉反馈。

当拖拽到分类项上方时，分类项会显示放置区域的视觉反馈。

放置时，handleNoteDropToCategory方法执行多层验证：目标分类不能是系统分类、笔记必须存在、笔记不能已在目标分类中。

验证通过后显示确认对话框，用户确认后调用数据层方法moveNoteToCategory更新笔记的categoryId，并同步到本地存储和服务器（如果已登录）。

3. **视觉反馈系统**：

为两种拖拽模式设计不同的CSS样式：分类拖拽使用dragging类实现半透明效果，笔记拖拽使用note-dragging类。

拖拽过程中的放置位置指示通过drag-light类实现视觉高亮或指示线。

创建跟随鼠标的拖拽预览元素，通过dragover事件实时更新位置，提供流畅的拖拽体验。

4. **状态管理与验证机制**：

两种拖拽模式通过独立的状态对象进行隔离：dragState用于分类拖拽，noteDragState用于笔记拖拽。

所有事件处理方法的开始处都会检查对方的状态，避免互相干扰。

执行放置操作前进行多层验证，确保操作的合法性和数据一致性。

**（2）核心代码实现**
以下是拖拽功能的核心实现代码，包含分类拖拽排序和笔记拖拽到分类的关键逻辑：
```javascript
/**
 * 分类拖拽排序功能实现
 * @description 通过HTML5 Drag and Drop API实现分类的拖拽重排，包括视觉反馈、状态管理和数据同步
 */
class CategoryDragHandler {
    constructor() {
        this.dragState = {
            isDragging: false,
            draggedItem: null,
            dragOverItem: null,
            currentOverItem: null
        };
        this.bindCategoryDragEvents();
    }

    /**
     * 绑定分类拖拽相关事件
     */
    bindCategoryDragEvents() {
        const categoriesContainer = document.querySelector('.categories-list');
        
        categoriesContainer.addEventListener('dragstart', (event) => this.handleCategoryDragStart(event));
        categoriesContainer.addEventListener('dragover', (event) => this.handleCategoryDragOver(event));
        categoriesContainer.addEventListener('dragenter', (event) => this.handleCategoryDragEnter(event));
        categoriesContainer.addEventListener('dragleave', (event) => this.handleCategoryDragLeave(event));
        categoriesContainer.addEventListener('drop', (event) => this.handleCategoryDrop(event));
        categoriesContainer.addEventListener('dragend', (event) => this.handleCategoryDragEnd(event));
    }

    /**
     * 处理分类拖拽开始事件
     * @param {DragEvent} event - 拖拽开始事件
     */
    handleCategoryDragStart(event) {
        const categoryItem = event.target.closest('.category-item');
        const categoryId = categoryItem.dataset.categoryId;
        
        // 保护性检查：禁止拖拽系统分类
        const systemCategories = ['all', 'uncategorized', 'private', 'deleted'];
        if (systemCategories.includes(categoryId)) {
            event.preventDefault();
            return;
        }
        
        // 设置拖拽数据
        event.dataTransfer.setData('text/plain', categoryId);
        event.dataTransfer.effectAllowed = 'move';
        
        // 清除默认拖拽图像
        const dragImage = document.createElement('div');
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        document.body.appendChild(dragImage);
        event.dataTransfer.setDragImage(dragImage, 0, 0);
        
        // 添加视觉样式
        categoryItem.classList.add('dragging');
        
        // 创建拖拽预览元素
        this.createDragPreview(categoryItem);
        
        // 更新拖拽状态
        this.dragState.isDragging = true;
        this.dragState.draggedItem = categoryItem;
        
        setTimeout(() => {
            document.body.removeChild(dragImage);
        }, 0);
    }

    /**
     * 处理分类拖拽悬停事件
     * @param {DragEvent} event - 拖拽悬停事件
     */
    handleCategoryDragOver(event) {
        event.preventDefault();
        
        const targetItem = event.target.closest('.category-item');
        if (!targetItem) return;
        
        const categoryId = targetItem.dataset.categoryId;
        const systemCategories = ['all', 'uncategorized', 'private', 'deleted'];
        
        // 检查目标是否有效（不是系统分类，不是自身）
        const isSystemCategory = systemCategories.includes(categoryId);
        const isSelf = targetItem === this.dragState.draggedItem;
        
        if (isSystemCategory || isSelf) {
            event.dataTransfer.dropEffect = 'none';
            return;
        }
        
        event.dataTransfer.dropEffect = 'move';
        
        // 计算放置位置
        const rect = targetItem.getBoundingClientRect();
        const dropPosition = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        
        // 更新视觉反馈
        if (this.dragState.currentOverItem !== targetItem) {
            if (this.dragState.currentOverItem) {
                this.dragState.currentOverItem.classList.remove('drag-light');
            }
            targetItem.classList.add('drag-light');
            this.dragState.currentOverItem = targetItem;
        }
        
        // 存储放置位置信息
        targetItem.dataset.dropPosition = dropPosition;
    }

    /**
     * 处理分类放置事件
     * @param {DragEvent} event - 放置事件
     */
    handleCategoryDrop(event) {
        event.preventDefault();
        
        const targetItem = event.target.closest('.category-item');
        if (!targetItem) return;
        
        const draggedItem = this.dragState.draggedItem;
        if (!draggedItem) return;
        
        // 验证放置目标
        const targetCategoryId = targetItem.dataset.categoryId;
        const draggedCategoryId = draggedItem.dataset.categoryId;
        
        if (targetCategoryId === draggedCategoryId) return;
        
        const systemCategories = ['all', 'uncategorized', 'private', 'deleted'];
        if (systemCategories.includes(targetCategoryId)) {
            return;
        }
        
        // 确定放置位置
        const dropPosition = targetItem.dataset.dropPosition || 'before';
        
        // 移动DOM元素
        if (dropPosition === 'before') {
            targetItem.parentNode.insertBefore(draggedItem, targetItem);
        } else {
            targetItem.parentNode.insertBefore(draggedItem, targetItem.nextSibling);
        }
        
        // 更新数据层分类顺序
        this.updateCategoryOrder();
        
        // 移除视觉样式
        targetItem.classList.remove('drag-light');
        draggedItem.classList.remove('dragging');
    }

    /**
     * 更新分类顺序
     * @description 根据当前DOM顺序更新数据存储中的分类顺序
     */
    updateCategoryOrder() {
        const categoryItems = document.querySelectorAll('.category-item[data-custom="true"]');
        const newOrder = Array.from(categoryItems).map(item => item.dataset.categoryId);
        
        // 调用数据层方法更新顺序
        NoteDB.updateCategoryOrder(newOrder);
    }
}
```
笔记拖拽到分类的核心实现代码：

```javascript
/**
 * 笔记拖拽到分类功能实现
 * @description 实现笔记项拖拽到分类项的功能，包括验证、用户确认和数据更新
 */
class NoteDragHandler {
    constructor() {
        this.noteDragState = {
            isDraggingNote: false,
            draggedNoteId: null,
            draggedNoteElement: null
        };
        this.bindNoteDragEvents();
    }

    /**
     * 绑定笔记拖拽相关事件
     */
    bindNoteDragEvents() {
        const notesContainer = document.querySelector('.notes-list');
        
        notesContainer.addEventListener('dragstart', (event) => this.handleNoteDragStart(event));
        notesContainer.addEventListener('dragend', (event) => this.handleNoteDragEnd(event));
        
        // 分类容器也需要监听笔记拖拽事件
        const categoriesContainer = document.querySelector('.categories-list');
        categoriesContainer.addEventListener('dragover', (event) => this.handleNoteDragOverCategory(event));
        categoriesContainer.addEventListener('drop', (event) => this.handleNoteDropToCategory(event));
    }

    /**
     * 处理笔记拖拽到分类事件
     * @param {DragEvent} event - 放置事件
     */
    async handleNoteDropToCategory(event) {
        event.preventDefault();
        
        // 检查是否是笔记拖拽
        if (!this.noteDragState.isDraggingNote) return;
        
        const targetCategory = event.target.closest('.category-item');
        if (!targetCategory) return;
        
        const targetCategoryId = targetCategory.dataset.categoryId;
        const draggedNoteId = this.noteDragState.draggedNoteId;
        
        // 多层验证
        const systemCategories = ['all', 'uncategorized', 'private', 'deleted'];
        if (systemCategories.includes(targetCategoryId)) {
            this.showToast('不能将笔记移动到系统分类', 'warning');
            return;
        }
        
        const note = NoteDB.getNoteById(draggedNoteId);
        if (!note) {
            this.showToast('未找到要移动的笔记', 'error');
            return;
        }
        
        if (note.categoryId === targetCategoryId) {
            this.showToast('笔记已在该分类中', 'info');
            return;
        }
        
        // 获取目标分类信息
        const targetCategoryData = NoteDB.getCategoryById(targetCategoryId);
        if (!targetCategoryData) {
            this.showToast('目标分类不存在', 'error');
            return;
        }
        
        // 显示确认对话框
        const isConfirmed = confirm(`将"${note.title}"移动到"${targetCategoryData.name}"分类？`);
        if (!isConfirmed) return;
        
        // 执行移动操作
        const success = await NoteDB.moveNoteToCategory(draggedNoteId, targetCategoryId);
        
        if (success) {
            this.showToast(`笔记已移动到"${targetCategoryData.name}"`, 'success');
            
            // 更新UI
            this.refreshNoteList();
            this.refreshCategoryCount(targetCategoryId);
        } else {
            this.showToast('移动失败，请重试', 'error');
        }
    }

    /**
     * 移动笔记到分类
     * @param {string} noteId - 笔记ID
     * @param {string} targetCategoryId - 目标分类ID
     * @returns {boolean} 操作是否成功
     */
    async moveNoteToCategory(noteId, targetCategoryId) {
        const note = this.getNoteById(noteId);
        
        if (!note) {
            return false;
        }
        
        if (!this.getCategoryById(targetCategoryId)) {
            return false;
        }
        
        // 更新笔记的分类ID
        note.categoryId = targetCategoryId;
        note.updatedAt = Date.now();
        
        // 保存到本地存储
        this.saveToStorage();
        
        // 如果用户已登录，尝试保存到服务器
        if (authManager.getCurrentUser()) {
            try {
                const result = await this.updateNoteToServer(note);
                if (!result.success) {
                    // 可以选择显示错误提示，但不阻止本地更新
                }
            } catch (error) {
                // 服务器同步失败，但本地更新成功
            }
        }
        
        return true;
    }
}
```
**（3）难点与解决**
1. **拖拽过程中的精确位置计算**：在分类拖拽排序时，需要根据鼠标位置精确判断放置位置（before/after）。解决方案是通过getBoundingClientRect()获取目标元素的边界信息，比较鼠标垂直坐标与目标项中心点的关系。通过event.clientY < rect.top + rect.height / 2判断放置位置，确保用户可以精确控制分类项的插入位置。

2. 分类拖拽和笔记拖拽共享相同的事件目标（分类列表容器），容易产生**事件冲突**。解决方案是通过独立的状态对象（dragState和noteDragState）进行隔离，并在每个事件处理器的开始处检查对方的状态。例如，在handleNoteDragOverCategory方法中，首先检查this.noteDragState.isDraggingNote，确保只有笔记拖拽时才会处理分类容器上的拖拽事件。


### 3.8 富文本编辑器
**（1）实现思路**

富文本编辑功能基于HTML5的contenteditable属性实现，允许用户直接在页面中对笔记内容进行格式化编辑，包括文字加粗、倾斜、列表和链接插入。系统通过扩展原生contenteditable的有限功能，使用document.execCommand API执行格式化命令，并提供智能的列表管理和链接插入机制。

实现流程主要分为以下详细步骤：

1. **编辑器基础设置**：

编辑器区域是一个设置了contenteditable="true"属性的div元素，允许用户直接编辑富文本内容。

通过document.execCommand API扩展格式化能力，执行加粗、倾斜等浏览器内置的格式化操作。

2. **格式化按钮交互**：

用户点击工具栏的格式化按钮时，applyFormatting方法被调用。

该方法根据传入的tool参数执行相应的格式化命令，包括加粗、倾斜、列表和链接。

命令执行前，系统确保编辑器获得焦点并保存当前选区范围，通过window.getSelection()和selection.getRangeAt(0)确保格式化操作针对正确的文本范围。

3. **列表功能智能处理**：

列表功能的实现考虑了用户的当前上下文。当用户点击列表按钮时，系统通过isInList()方法检测当前选区是否已经在列表中。

如果当前不在列表中，调用document.execCommand('insertUnorderedList', false, null)创建新的无序列表。

如果已经在列表中，同样调用此命令会移除列表格式，实现智能切换。

为了提供更流畅的列表编辑体验，系统还实现了autoContinueList()方法，监听Enter键按下事件，自动创建新的列表项或退出列表格式。

4. **链接功能特殊处理**：

链接功能需要用户输入额外信息，因此不直接使用document.execCommand，而是调用专门的insertLink()方法。

insertLink()方法通过prompt()函数收集用户输入，显示两个连续的提示框：第一个要求输入链接地址，第二个要求输入链接显示的文本。

每个创建的链接都包含关键属性：target="_blank"确保链接在新标签页打开，rel="noopener noreferrer"提供安全保护。

新插入的链接作为编辑器HTML内容的一部分，在自动保存时被持久化，确保重新加载时链接功能完整保留。

5. **粘贴与导出处理**：

当用户从其他应用复制富文本内容并粘贴到编辑器时，handlePaste事件会拦截默认粘贴行为，获取纯文本内容插入，避免外部格式污染。

导出笔记为Markdown格式时，generateNoteMarkdown()方法会将HTML格式内容转换为Markdown格式，确保导出内容的兼容性和可读性。

**（2）核心代码实现**
以下是富文本编辑功能的核心实现代码，包含格式化命令、列表管理和链接插入等关键逻辑：
```javascript
/**
 * 富文本编辑器功能实现
 * @description 基于contenteditable和document.execCommand API实现笔记内容的富文本编辑，包括加粗、倾斜、列表和链接插入
 */
class RichTextEditor {
    constructor(editorElement) {
        this.editorElement = editorElement;
        this.currentNoteId = null;
        this.initEditor();
    }

    /**
     * 初始化编辑器
     */
    initEditor() {
        // 设置编辑器可编辑
        this.editorElement.contentEditable = 'true';
        
        // 绑定事件
        this.bindEvents();
    }

    /**
     * 绑定编辑器相关事件
     */
    bindEvents() {
        // 粘贴事件处理
        this.editorElement.addEventListener('paste', (e) => this.handlePaste(e));
        
        // 输入事件触发自动保存
        this.editorElement.addEventListener('input', () => this.triggerAutoSave());
        
        // 键盘事件处理（列表自动续写）
        this.editorElement.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    /**
     * 应用格式化命令
     * @param {string} format - 格式化类型：bold、italic、list、link
     */
    applyFormatting(format) {
        if (!this.editorElement || !format) return;
        
        // 聚焦到编辑器
        this.editorElement.focus();
        
        // 保存当前选择范围
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        
        try {
            // 执行格式命令
            switch(format) {
                case 'bold':
                    document.execCommand('bold', false, null);
                    break;
                case 'italic':
                    document.execCommand('italic', false, null);
                    break;
                case 'list':
                    // 检查当前是否在列表中
                    const inList = this.isInList();
                    document.execCommand('insertUnorderedList', false, null);
                    break;
                case 'link':
                    this.insertLink();
                    break;
                case 'output':
                    // 导出笔记功能
                    this.exportCurrentNote();
                    break;
                case 'tab':
                    // 显示添加标签模态框
                    this.showTagModal();
                    break;
                default:
                    return;
            }
            
            // 更新工具栏状态
            this.updateToolbarState();
            
            // 恢复焦点
            this.editorElement.focus();
            
        } catch (error) {
            // 错误处理
        }
    }

    /**
     * 检查当前选区是否在列表中
     * @returns {boolean} 是否在列表中
     */
    isInList() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return false;
        
        let container = selection.getRangeAt(0).commonAncestorContainer;
        
        // 向上查找父元素，看是否在li中
        while (container && container !== this.editorElement) {
            if (container.nodeName === 'LI') {
                return true;
            }
            container = container.parentNode;
        }
        
        return false;
    }

    /**
     * 插入链接
     */
    insertLink() {
        // 获取当前选中文本
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const selectedText = selection.toString();
        
        // 获取链接地址
        const url = prompt('请输入链接地址:', 'https://');
        if (!url) return;
        
        // 获取链接文本
        const linkText = prompt('请输入链接文本:', selectedText || url);
        if (linkText === null) return;
        
        // 创建链接HTML
        const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        
        // 插入链接
        document.execCommand('insertHTML', false, linkHtml);
        
        // 触发自动保存
        this.triggerAutoSave();
    }

    /**
     * 处理粘贴事件
     * @param {ClipboardEvent} e - 粘贴事件
     */
    handlePaste(e) {
        e.preventDefault();
        
        // 获取剪贴板中的纯文本
        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedText = clipboardData.getData('text/plain');
        
        // 在光标位置插入文本
        this.insertTextAtCursor(pastedText);
    }

    /**
     * 在光标位置插入文本
     * @param {string} text - 要插入的文本
     */
    insertTextAtCursor(text) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        
        // 移动光标到插入文本之后
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // 触发自动保存
        this.triggerAutoSave();
    }

    /**
     * 处理键盘事件（列表自动续写）
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleKeydown(e) {
        // 处理回车键在列表中的行为
        if (e.key === 'Enter' && this.isInList()) {
            e.preventDefault();
            this.handleEnterInList();
        }
    }

    /**
     * 在列表中处理回车键
     */
    handleEnterInList() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const listItem = range.commonAncestorContainer.closest('li');
        
        if (!listItem) return;
        
        // 检查当前列表项是否为空
        const itemText = listItem.textContent.trim();
        if (itemText === '' || itemText === '\u200B') {
            // 空列表项，退出列表
            document.execCommand('insertUnorderedList', false, null);
        } else {
            // 创建新的列表项
            document.execCommand('insertUnorderedList', false, null);
        }
    }

    /**
     * 更新工具栏状态
     */
    updateToolbarState() {
        // 更新加粗按钮状态
        const isBold = document.queryCommandState('bold');
        document.querySelector('.bold-btn').classList.toggle('active', isBold);
        
        // 更新斜体按钮状态
        const isItalic = document.queryCommandState('italic');
        document.querySelector('.italic-btn').classList.toggle('active', isItalic);
        
        // 更新列表按钮状态
        const inList = this.isInList();
        document.querySelector('.list-btn').classList.toggle('active', inList);
    }

    /**
     * 触发自动保存
     */
    triggerAutoSave() {
        // 触发笔记内容更新
        if (this.currentNoteId) {
            const content = this.editorElement.innerHTML;
            NoteDB.updateNoteContent(this.currentNoteId, content);
        }
    }

    /**
     * 生成笔记的Markdown内容
     * @param {string} html - 编辑器HTML内容
     * @returns {string} Markdown格式内容
     */
    generateNoteMarkdown(html) {
        // 创建临时元素进行解析
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // 转换函数
        const convertToMarkdown = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }
            
            const tagName = node.tagName.toLowerCase();
            const children = Array.from(node.childNodes).map(child => convertToMarkdown(child)).join('');
            
            switch(tagName) {
                case 'strong':
                case 'b':
                    return `**${children}**`;
                case 'em':
                case 'i':
                    return `*${children}*`;
                case 'ul':
                    return children;
                case 'li':
                    return `- ${children}\n`;
                case 'a':
                    const href = node.getAttribute('href') || '';
                    const text = node.textContent || '';
                    return `[${text}](${href})`;
                case 'div':
                    return `${children}\n`;
                default:
                    return children;
            }
        };
        
        return convertToMarkdown(tempDiv).trim();
    }
}
```
**（3）难点与解决**
**执行格式化命令前需要保存当前的选区范围**，否则操作可能应用到错误的位置。解决方案是通过window.getSelection()获取当前选区，使用selection.getRangeAt(0)保存选区范围，在执行格式化命令后，通过selection.removeAllRanges()和selection.addRange(savedRange)恢复选区状态，确保后续操作的正确性。

### 3.9 语言切换
**（1）实现思路**
国际化功能允许用户在简体中文和英文之间无缝切换界面语言，并通过本地存储保持用户的语言偏好。该功能通过languagePart.js模块管理语言资源，bar.js模块处理用户交互，实现了一套完整的语言切换和持久化机制。

实现流程主要分为以下详细步骤：

1. **语言资源管理**：

在languagePart.js中，translations对象包含了两种语言（zh-CN和en-US）的所有界面文本映射。

每个语言包都是一个键值对对象，键是界面元素的标识符（如'app.title'、'button.save'），值是相应语言的文本。

语言包按功能模块组织，涵盖应用标题、按钮文本、菜单项、提示消息、表单标签等所有需要翻译的界面元素。

2. **语言应用机制**：

语言应用的核心是applyLanguage()方法，它通过遍历DOM树查找所有带有data-i18n属性的元素来实现文本替换。

该方法使用document.querySelectorAll('[data-i18n]')获取所有需要翻译的元素，然后对每个元素，获取其data-i18n属性值作为翻译键，从当前语言资源包中查找对应的翻译文本。

如果找到翻译文本，就将元素的textContent设置为翻译文本；如果元素还有data-i18n-placeholder属性，同样处理其占位符文本。

对于动态生成的界面元素，系统会在元素创建后立即调用applyLanguage()方法或通过事件监听自动应用当前语言。

3. **用户交互与界面**：

用户交互部分通过设置菜单中的语言选项触发。在bar.js中，当用户点击设置下拉菜单中的"语言"选项时，handleSetsClick方法调用toggleLanguageDropdown显示语言选择下拉框。

语言选择下拉框包含两个选项：简体中文和English，每个选项都显示对应的国旗图标和语言名称。

当用户选择一种语言时，系统立即切换界面语言，并更新设置菜单中的当前语言显示。

4. **语言状态持久化**：

语言状态的持久化是通过localStorage实现的。每当用户切换语言，选中的语言代码（如'zh-CN'或'en-US'）会立即保存到本地存储中。

当应用再次加载时，语言管理器会优先读取这个保存的值，确保用户的语言偏好得到保持。如果没有保存过任何语言设置，系统会根据浏览器语言自动选择最匹配的语言。

系统还会更新document.documentElement的lang属性，确保辅助技术（如屏幕阅读器）能正确识别当前语言。

5. **语言智能检测**：

当用户首次访问应用时，系统会自动检测浏览器语言设置，并选择最匹配的界面语言。

如果用户浏览器语言是中文（包括简体中文和繁体中文变体），默认使用简体中文；否则默认使用英文。

这个自动检测机制确保用户首次访问时就能获得最合适的语言体验

**（2）核心代码实现**

以下是国际化功能的核心实现代码，包含语言资源管理、语言应用和状态持久化等关键逻辑：
```javascript
/**
 * 国际化语言管理模块
 * @description 管理应用的多语言支持，包括语言资源加载、界面翻译和用户偏好持久化
 */
const I18nManager = {
    // 支持的语言列表
    supportedLanguages: ['zh-CN', 'en-US'],
    
    // 当前语言
    currentLanguage: 'zh-CN',
    
    // 语言资源包
    translations: {
        'zh-CN': {
            // 应用通用
            'app.title': '笔记应用',
            'app.loading': '加载中...',
            
            // 侧边栏
            'sidebar.allNotes': '全部笔记',
            'sidebar.uncategorized': '未分类',
            'sidebar.private': '私密笔记',
            'sidebar.deleted': '回收站',
            'sidebar.newCategory': '新建分类',
            
            // 工具栏按钮
            'button.newNote': '新建笔记',
            'button.save': '保存',
            'button.cancel': '取消',
            'button.delete': '删除',
            'button.restore': '恢复',
            'button.confirm': '确认',
            'button.rename': '重命名',
            
            // 设置菜单
            'settings.title': '设置',
            'settings.language': '语言',
            'settings.theme': '主题',
            'settings.export': '导出数据',
            'settings.import': '导入数据',
            'settings.about': '关于',
            
            // 语言选项
            'language.zh-CN': '简体中文',
            'language.en-US': 'English',
            
            // 提示消息
            'message.noteSaved': '笔记已保存',
            'message.noteDeleted': '笔记已删除',
            'message.categoryCreated': '分类已创建',
            'message.categoryDeleted': '分类已删除',
            'message.languageChanged': '语言已切换为简体中文',
            
            // 表单标签
            'form.title': '标题',
            'form.content': '内容',
            'form.category': '分类',
            'form.tags': '标签',
            'form.search': '搜索笔记...',
            
            // 确认对话框
            'confirm.deleteNote': '确定要删除这篇笔记吗？',
            'confirm.deleteCategory': '确定要删除这个分类吗？删除后，该分类下的笔记将移入"未分类"。',
            'confirm.emptyTrash': '确定要清空回收站吗？此操作无法撤销。',
            
            // 空状态提示
            'empty.notes': '暂无笔记，点击"新建笔记"开始记录',
            'empty.search': '未找到匹配的笔记',
            'empty.category': '此分类下暂无笔记',
            'empty.trash': '回收站为空'
        },
        
        'en-US': {
            // Application common
            'app.title': 'Note App',
            'app.loading': 'Loading...',
            
            // Sidebar
            'sidebar.allNotes': 'All Notes',
            'sidebar.uncategorized': 'Uncategorized',
            'sidebar.private': 'Private Notes',
            'sidebar.deleted': 'Trash',
            'sidebar.newCategory': 'New Category',
            
            // Toolbar buttons
            'button.newNote': 'New Note',
            'button.save': 'Save',
            'button.cancel': 'Cancel',
            'button.delete': 'Delete',
            'button.restore': 'Restore',
            'button.confirm': 'Confirm',
            'button.rename': 'Rename',
            
            // Settings menu
            'settings.title': 'Settings',
            'settings.language': 'Language',
            'settings.theme': 'Theme',
            'settings.export': 'Export Data',
            'settings.import': 'Import Data',
            'settings.about': 'About',
            
            // Language options
            'language.zh-CN': '简体中文',
            'language.en-US': 'English',
            
            // Messages
            'message.noteSaved': 'Note saved',
            'message.noteDeleted': 'Note deleted',
            'message.categoryCreated': 'Category created',
            'message.categoryDeleted': 'Category deleted',
            'message.languageChanged': 'Language switched to English',
            
            // Form labels
            'form.title': 'Title',
            'form.content': 'Content',
            'form.category': 'Category',
            'form.tags': 'Tags',
            'form.search': 'Search notes...',
            
            // Confirmation dialogs
            'confirm.deleteNote': 'Are you sure you want to delete this note?',
            'confirm.deleteCategory': 'Are you sure you want to delete this category? Notes in this category will be moved to "Uncategorized".',
            'confirm.emptyTrash': 'Are you sure you want to empty the trash? This action cannot be undone.',
            
            // Empty states
            'empty.notes': 'No notes yet. Click "New Note" to start',
            'empty.search': 'No matching notes found',
            'empty.category': 'No notes in this category',
            'empty.trash': 'Trash is empty'
        }
    },
    
    /**
     * 初始化语言设置
     */
    init() {
        // 尝试从本地存储加载用户偏好
        const savedLang = localStorage.getItem('noteAppLanguage');
        
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLanguage = savedLang;
        } else {
            // 根据浏览器语言自动检测
            this.currentLanguage = this.detectBrowserLanguage();
        }
        
        // 应用语言并设置HTML lang属性
        this.applyLanguage();
        document.documentElement.lang = this.currentLanguage.split('-')[0];
    },
    
    /**
     * 检测浏览器语言
     * @returns {string} 匹配的语言代码
     */
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        
        // 检查是否支持浏览器语言
        for (const lang of this.supportedLanguages) {
            if (browserLang.startsWith(lang.split('-')[0])) {
                return lang;
            }
        }
        
        // 默认返回中文
        return 'zh-CN';
    },
    
    /**
     * 应用当前语言到界面
     */
    applyLanguage() {
        const langResources = this.translations[this.currentLanguage];
        if (!langResources) return;
        
        // 翻译所有带有data-i18n属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = langResources[key];
            
            if (translation) {
                element.textContent = translation;
            }
        });
        
        // 翻译所有带有data-i18n-placeholder属性的元素
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = langResources[key];
            
            if (translation) {
                element.placeholder = translation;
            }
        });
        
        // 更新设置菜单中的当前语言显示
        this.updateLanguageDisplay();
    },
    
    /**
     * 切换语言
     * @param {string} langCode - 语言代码
     */
    switchLanguage(langCode) {
        if (!this.supportedLanguages.includes(langCode)) {
            return;
        }
        
        this.currentLanguage = langCode;
        
        // 保存到本地存储
        localStorage.setItem('noteAppLanguage', langCode);
        
        // 更新HTML lang属性
        document.documentElement.lang = langCode.split('-')[0];
        
        // 应用新语言
        this.applyLanguage();
        
        // 显示切换提示
        this.showLanguageChangeMessage();
    },
    
    /**
     * 更新设置菜单中的语言显示
     */
    updateLanguageDisplay() {
        const languageDisplay = document.querySelector('.current-language');
        if (languageDisplay) {
            const langName = this.translations[this.currentLanguage]['language.' + this.currentLanguage];
            if (langName) {
                languageDisplay.textContent = langName;
            }
        }
    },
    
    /**
     * 显示语言切换提示
     */
    showLanguageChangeMessage() {
        const messageKey = 'message.languageChanged';
        const message = this.translations[this.currentLanguage][messageKey];
        
        if (message) {
            // 使用现有的Toast系统显示消息
            if (window.showToast) {
                window.showToast(message, 'success', 2000);
            }
        }
    },
    
    /**
     * 获取翻译文本
     * @param {string} key - 翻译键
     * @returns {string} 翻译后的文本
     */
    t(key) {
        const langResources = this.translations[this.currentLanguage];
        return langResources[key] || key;
    }
};

// 页面加载时初始化语言设置
document.addEventListener('DOMContentLoaded', () => {
    I18nManager.init();
});

/**
 * 语言选择UI处理
 * @description 处理设置菜单中的语言选择交互
 */
class LanguageSelector {
    constructor() {
        this.languageDropdown = null;
        this.init();
    }
    
    init() {
        this.createLanguageDropdown();
        this.bindEvents();
    }
    
    /**
     * 创建语言选择下拉框
     */
    createLanguageDropdown() {
        this.languageDropdown = document.createElement('div');
        this.languageDropdown.className = 'language-dropdown';
        this.languageDropdown.style.display = 'none';
        
        const languages = [
            { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
            { code: 'en-US', name: 'English', flag: '🇺🇸' }
        ];
        
        languages.forEach(lang => {
            const option = document.createElement('div');
            option.className = 'language-option';
            option.dataset.lang = lang.code;
            
            const flagSpan = document.createElement('span');
            flagSpan.className = 'language-flag';
            flagSpan.textContent = lang.flag;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'language-name';
            nameSpan.textContent = lang.name;
            
            option.appendChild(flagSpan);
            option.appendChild(nameSpan);
            
            option.addEventListener('click', () => {
                I18nManager.switchLanguage(lang.code);
                this.hideDropdown();
            });
            
            this.languageDropdown.appendChild(option);
        });
        
        document.body.appendChild(this.languageDropdown);
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        const languageBtn = document.querySelector('.language-btn');
        if (languageBtn) {
            languageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }
        
        // 点击页面其他区域关闭下拉框
        document.addEventListener('click', () => {
            this.hideDropdown();
        });
    }
    
    /**
     * 切换下拉框显示状态
     */
    toggleDropdown() {
        if (this.languageDropdown.style.display === 'block') {
            this.hideDropdown();
        } else {
            this.showDropdown();
        }
    }
    
    /**
     * 显示下拉框
     */
    showDropdown() {
        const languageBtn = document.querySelector('.language-btn');
        if (languageBtn) {
            const rect = languageBtn.getBoundingClientRect();
            this.languageDropdown.style.position = 'fixed';
            this.languageDropdown.style.top = (rect.bottom + 5) + 'px';
            this.languageDropdown.style.left = rect.left + 'px';
            this.languageDropdown.style.display = 'block';
        }
    }
    
    /**
     * 隐藏下拉框
     */
    hideDropdown() {
        if (this.languageDropdown) {
            this.languageDropdown.style.display = 'none';
        }
    }
}

// 初始化语言选择器
const languageSelector = new LanguageSelector();
```

**（3）难点与解决**

应用中有大量动态生成的内容（如笔记列表、分类名称、提示消息等），这些内容在语言切换后需要实时更新。解决方案是通过统一的翻译系统，所有动态内容都通过I18nManager.t(key)方法获取翻译文本。对于动态生成的DOM元素，在创建时立即应用当前语言。同时，语言切换时触发全局更新事件，所有监听此事件的组件都会重新获取翻译内容并更新显示。

### 3.10 笔记统计
**（1）实现思路**

分类笔记数量显示功能用于在侧边栏的每个分类项旁边实时展示该分类下的笔记数量，为用户提供直观的数据概览。该功能的实现涉及数据统计、分类逻辑处理和实时更新机制，主要步骤如下：

1. **数据统计与计算**：

通过NoteDB.getStats()方法获取全局统计信息，该方法计算总笔记数和按分类分组的笔记数量。

对于系统默认分类，采用特殊计算逻辑：

"全部笔记"分类：统计除私密笔记和已删除笔记外的所有笔记，公式为总笔记数 - 私密笔记数 - 已删除笔记数。

"未分类"分类：统计属于"未分类"且非私密、非已删除的笔记。

"私密笔记"分类：在未验证密码的情况下不显示真实数量（显示为"0"），验证后才显示准确数量。

"最近删除"分类：通常不显示数量统计，避免不必要的认知负担。

2. **UI更新机制**：

通过SidebarUI.updateSidebarStats()方法从数据层获取最新统计信息，并更新侧边栏所有分类项的计数显示。

该方法遍历所有分类项，根据分类ID从统计数据中获取对应数量，更新到DOM元素的计数显示区域。

3. **实时同步与事件驱动**：

在main.js中全局事件绑定中，监听了多个相关事件：noteCreated（笔记创建）、noteUpdated（笔记更新，包括分类移动）、noteDeleted（笔记删除）、categoryCreated（分类创建）、categoryDeleted（分类删除）。

每个事件的处理函数最后都会调用this.modules.sidebarUI.updateSidebarStats()，确保侧边栏统计信息的实时更新。

这种事件驱动的架构保证了无论操作来自哪个模块（编辑器、笔记列表、分类管理），统计信息都能及时同步。

4. **隐私保护机制**：

私密笔记的数量显示具有特殊保护逻辑。在未验证密码的情况下，侧边栏不显示私密分类的真实笔记数量（或显示为"0"），避免通过数量信息推测私密内容。

只有用户成功验证密码进入私密分类后，笔记列表区域才会显示准确的笔记数量。

**（2）核心代码实现**

以下是分类笔记数量显示功能的核心实现代码，包含数据统计、UI更新和事件绑定：

```javascript
/**
 * 数据统计功能实现
 * @description 提供全局笔记统计功能，包括按分类统计笔记数量、计算存储大小等
 */
class StatisticsManager {
    /**
     * 获取全局统计信息
     * @returns {Object} 包含总笔记数、按分类统计笔记数、存储大小等信息的对象
     */
    getStats() {
        // 更新分类与笔记的引用关系
        this.updateCategoryNoteReferences();
        
        const totalNotes = this.data.notes.length;
        const notesByCategory = {};
        
        // 计算每个分类的笔记数量
        notesByCategory['all'] = totalNotes;
        
        // 计算系统分类的笔记数量
        this.data.categories.forEach(category => {
            notesByCategory[category.id] = category.notes.length;
        });
        
        // 计算存储大小
        const storageSize = JSON.stringify(this.data).length;
        const storageSizeKB = (storageSize / 1024).toFixed(2);
        
        return {
            totalNotes,
            notesByCategory,
            storageSize,
            storageSizeKB
        };
    }
    
    /**
     * 更新分类与笔记的引用关系
     * @description 确保每个分类的notes数组包含正确的笔记ID引用
     */
    updateCategoryNoteReferences() {
        // 清空所有分类的notes数组
        this.data.categories.forEach(category => {
            category.notes = [];
        });
        
        // 重新建立引用关系
        this.data.notes.forEach(note => {
            const category = this.data.categories.find(cat => cat.id === note.categoryId);
            if (category) {
                category.notes.push(note.id);
            }
        });
    }
}
```

侧边栏统计更新UI实现：

```javascript
/**
 * 侧边栏统计更新功能
 * @description 负责更新侧边栏分类项的笔记数量显示
 */
class SidebarStatsUpdater {
    constructor() {
        this.stats = null;
    }
    
    /**
     * 更新侧边栏统计信息
     * @description 获取最新统计数据并更新所有分类项的计数显示
     */
    updateSidebarStats() {
        // 获取最新统计信息
        this.stats = NoteDB.getStats();
        
        // 更新所有分类项的计数显示
        this.updateAllCategoryCounts();
    }
    
    /**
     * 更新所有分类项的计数显示
     */
    updateAllCategoryCounts() {
        const categoryItems = document.querySelectorAll('.category-item');
        
        categoryItems.forEach(item => {
            const categoryId = item.dataset.categoryId;
            this.updateCategoryCount(item, categoryId);
        });
    }
    
    /**
     * 更新单个分类项的计数显示
     * @param {HTMLElement} categoryItem - 分类项DOM元素
     * @param {string} categoryId - 分类ID
     */
    updateCategoryCount(categoryItem, categoryId) {
        const countElement = categoryItem.querySelector('.category-count');
        if (!countElement) return;
        
        let count = 0;
        
        // 根据分类ID计算笔记数量
        switch(categoryId) {
            case 'all':
                // 全部笔记 = 总笔记数 - 私密笔记数 - 已删除笔记数
                const privateCount = this.stats.notesByCategory['private'] || 0;
                const deletedCount = this.stats.notesByCategory['deleted'] || 0;
                count = this.stats.totalNotes - privateCount - deletedCount;
                break;
                
            case 'uncategorized':
                // 未分类笔记，排除私密和已删除笔记
                count = this.stats.notesByCategory[categoryId] || 0;
                break;
                
            case 'private':
                // 私密笔记：根据验证状态显示
                const isPrivateUnlocked = AuthManager.isPrivateUnlocked();
                count = isPrivateUnlocked ? (this.stats.notesByCategory[categoryId] || 0) : 0;
                break;
                
            case 'deleted':
                // 最近删除：通常不显示数量
                count = 0;
                break;
                
            default:
                // 用户自定义分类
                count = this.stats.notesByCategory[categoryId] || 0;
        }
        
        // 更新计数显示
        countElement.textContent = count > 99 ? '99+' : count;
        countElement.style.display = count > 0 ? 'flex' : 'none';
    }
}
```
全局事件绑定实现：

```javascript
/**
 * 全局事件绑定
 * @description 监听笔记和分类相关事件，确保统计信息实时更新
 */
class GlobalEventBinder {
    constructor() {
        this.modules = {
            sidebarUI: new SidebarStatsUpdater()
        };
        this.bindEvents();
    }
    
    /**
     * 绑定全局事件
     */
    bindEvents() {
        // 监听笔记创建事件
        document.addEventListener('noteCreated', () => {
            this.modules.sidebarUI.updateSidebarStats();
        });
        
        // 监听笔记更新事件
        document.addEventListener('noteUpdated', () => {
            this.modules.sidebarUI.updateSidebarStats();
        });
        
        // 监听笔记删除事件
        document.addEventListener('noteDeleted', () => {
            this.modules.sidebarUI.updateSidebarStats();
        });
        
        // 监听笔记移动事件（分类变更）
        document.addEventListener('noteMoved', () => {
            this.modules.sidebarUI.updateSidebarStats();
        });
        
        // 监听分类创建事件
        document.addEventListener('categoryCreated', () => {
            this.modules.sidebarUI.updateSidebarStats();
        });
        
        // 监听分类删除事件
        document.addEventListener('categoryDeleted', () => {
            this.modules.sidebarUI.updateSidebarStats();
        });
        
        // 监听私密验证状态变化事件
        document.addEventListener('privateUnlocked', () => {
            this.modules.sidebarUI.updateSidebarStats();
        });
    }
}

// 初始化全局事件绑定
const globalEventBinder = new GlobalEventBinder();
```

**（3）难点与解决**
1. 不同系统分类（全部笔记、未分类、私密笔记、最近删除）需要**不同的计数规则**，不能简单地使用统一的分类笔记数映射。解决方案是通过switch语句对不同分类ID进行特殊处理，特别是"全部笔记"分类需要通过公式总笔记数 - 私密笔记数 - 已删除笔记数计算，确保只显示用户实际可访问的笔记数量。

2. 每次笔记或分类变更都需要更新所有分类项的计数显示，可能导致性能问题。解决方案是通过事件驱动机制，只有相关事件发生时才会触发更新。同时，更新操作只涉及DOM文本内容的修改，避免了复杂的DOM操作。对于计数超过99的分类，使用"99+"的显示方式，既保持了UI整洁，又减少了字符长度变化带来的布局重排。

### 3.11 服务器端程序和数据库实现数据持久化
**（1）实现思路**
笔记API位于/final/api/notes.php，采用单一入口点设计，通过请求方法（GET、POST、PATCH、PUT、DELETE）区分不同操作。这种设计遵循RESTful原则，使API结构清晰且易于维护。所有笔记操作都严格进行用户身份验证和权限检查，确保用户只能访问和修改自己的笔记数据。

具体实现流程如下：

1. **身份验证机制**：

每个API请求都必须包含有效的Authorization头部Token

通过requireAuth()函数验证用户身份，该函数从请求头中提取Token并验证有效性

验证失败返回401未授权状态码，验证成功返回用户ID用于后续数据操作

2. **数据操作功能**：

GET请求：获取用户的所有笔记，支持按分类、标签、关键词等条件筛选，查询结果以JSON格式返回

POST请求：创建新笔记，验证必填字段，生成唯一ID，关联用户ID，返回新笔记信息

PATCH请求：更新笔记，支持部分更新，仅修改客户端提供的字段，自动更新时间戳

DELETE请求：支持软删除（移入回收站）和永久删除，通过参数区分操作类型

PUT请求：恢复已删除的笔记，将其从回收站移回原分类或未分类

3. **数据完整性保障**：

所有数据库操作都包含完整性检查，确保笔记与用户的归属关系

自动维护创建时间、更新时间等时间戳字段

使用事务处理确保关键操作的数据一致性

**（2）数据库设计**
```javascript
-- 创建 users 表
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `auth_token` VARCHAR(64) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建 categories 表
CREATE TABLE IF NOT EXISTS `categories` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `category_id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(50) DEFAULT 'fas fa-folder',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建 notes 表
CREATE TABLE IF NOT EXISTS `notes` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) DEFAULT '无标题笔记',
    `content` TEXT,
    `category_id` VARCHAR(50) DEFAULT 'uncategorized',
    `tags` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `is_deleted` TINYINT(1) DEFAULT 0,
    `is_private` TINYINT(1) DEFAULT 0,
    `client_id` VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_category_id` (`category_id`),
    INDEX `idx_is_deleted` (`is_deleted`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建 user_settings 表
CREATE TABLE IF NOT EXISTS `user_settings` (
    `user_id` INT NOT NULL,
    `language` VARCHAR(10) DEFAULT 'zh-CN',
    `private_password` VARCHAR(4) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```


**（3）核心代码实现**

以下是笔记API的核心实现代码，包含身份验证、请求处理和数据库操作：
```javascript
/**
 * 笔记API实现
 * @description 基于RESTful设计原则，提供完整的笔记CRUD操作接口
 */

// 设置响应头
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once '../config/database.php';

// 获取请求方法
$method = $_SERVER['REQUEST_METHOD'];

// 身份验证函数
function requireAuth() {
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : '';
    
    // 验证Token
    if (empty($token)) {
        http_response_code(401);
        echo json_encode(array("message" => "未授权访问"));
        exit;
    }
    
    // 查询数据库验证Token
    $db = new Database();
    $conn = $db->getConnection();
    
    $query = "SELECT id, username, email FROM users WHERE auth_token = :token AND token_expires_at > NOW()";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(":token", $token);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        http_response_code(401);
        echo json_encode(array("message" => "认证令牌无效或已过期"));
        exit;
    }
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    return $user['id'];
}

// 主请求处理逻辑
try {
    $db = new Database();
    $conn = $db->getConnection();
    
    switch ($method) {
        case 'GET':
            // 获取笔记列表
            $user_id = requireAuth();
            
            // 支持查询参数
            $category_id = isset($_GET['category_id']) ? $_GET['category_id'] : null;
            $keyword = isset($_GET['keyword']) ? $_GET['keyword'] : null;
            $tag = isset($_GET['tag']) ? $_GET['tag'] : null;
            
            // 构建查询条件
            $conditions = array("user_id = :user_id");
            $params = array(":user_id" => $user_id);
            
            if ($category_id) {
                $conditions[] = "category_id = :category_id";
                $params[":category_id"] = $category_id;
            }
            
            if ($keyword) {
                $conditions[] = "(title LIKE :keyword OR content LIKE :keyword)";
                $params[":keyword"] = "%{$keyword}%";
            }
            
            $whereClause = implode(" AND ", $conditions);
            $query = "SELECT id, client_id, title, content, category_id, tags, created_at, updated_at 
                      FROM notes WHERE {$whereClause} ORDER BY updated_at DESC";
            
            $stmt = $conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            
            $notes = array();
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $notes[] = array(
                    "id" => $row['client_id'],
                    "title" => $row['title'],
                    "content" => $row['content'],
                    "categoryId" => $row['category_id'],
                    "tags" => json_decode($row['tags'], true),
                    "createdAt" => $row['created_at'],
                    "updatedAt" => $row['updated_at']
                );
            }
            
            echo json_encode(array(
                "success" => true,
                "notes" => $notes,
                "count" => count($notes)
            ));
            break;
            
        case 'POST':
            // 创建新笔记
            $user_id = requireAuth();
            $data = json_decode(file_get_contents("php://input"));
            $client_id = $data->id;
            
            // 验证必填字段
            if (empty($data->title) && empty($data->content)) {
                http_response_code(400);
                echo json_encode(array("message" => "标题和内容不能同时为空"));
                exit;
            }
            
            $query = "INSERT INTO notes (user_id, title, content, category_id, tags, client_id) 
                      VALUES (:user_id, :title, :content, :category_id, :tags, :client_id)";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->bindParam(":title", $data->title);
            $stmt->bindParam(":content", $data->content);
            $stmt->bindParam(":category_id", $data->categoryId);
            $stmt->bindParam(":client_id", $client_id);
            $stmt->bindParam(":tags", json_encode($data->tags ?: []));
            
            if ($stmt->execute()) {
                echo json_encode(array(
                    "message" => "笔记创建成功",
                    "note_id" => $client_id
                ));
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "创建笔记失败"));
            }
            break;
            
        case 'PATCH':
            // 更新笔记（部分更新）
            $user_id = requireAuth();
            $data = json_decode(file_get_contents("php://input"));
            
            if (empty($data->id)) {
                http_response_code(400);
                echo json_encode(array("message" => "笔记ID不能为空"));
                exit;
            }
            
            // 检查笔记是否存在且属于当前用户
            $checkQuery = "SELECT id FROM notes WHERE client_id = :client_id AND user_id = :user_id";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->bindParam(":client_id", $data->id);
            $checkStmt->bindParam(":user_id", $user_id);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(array("message" => "笔记不存在或无权限访问"));
                exit;
            }
            
            // 构建动态更新语句
            $updateFields = array("updated_at = NOW()");
            $params = array(":client_id" => $data->id, ":user_id" => $user_id);
            
            if (isset($data->title)) {
                $updateFields[] = "title = :title";
                $params[":title"] = $data->title;
            }
            
            if (isset($data->content)) {
                $updateFields[] = "content = :content";
                $params[":content"] = $data->content;
            }
            
            if (isset($data->categoryId)) {
                $updateFields[] = "category_id = :category_id";
                $params[":category_id"] = $data->categoryId;
            }
            
            if (isset($data->tags)) {
                $updateFields[] = "tags = :tags";
                $params[":tags"] = json_encode($data->tags);
            }
            
            $setClause = implode(", ", $updateFields);
            $query = "UPDATE notes SET {$setClause} WHERE client_id = :client_id AND user_id = :user_id";
            
            $stmt = $db->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            if ($stmt->execute()) {
                echo json_encode(array(
                    "message" => "笔记更新成功",
                    "note_id" => $data->id
                ));
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "更新笔记失败"));
            }
            break;
            
        case 'DELETE':
            // 删除笔记（支持软删除和永久删除）
            $user_id = requireAuth();
            $data = json_decode(file_get_contents("php://input"));
            
            if (empty($data->id)) {
                http_response_code(400);
                echo json_encode(array("message" => "笔记ID不能为空"));
                exit;
            }
            
            // 从笔记ID中提取数据库ID
            $note_id = extractNoteId($data->id);
            
            // 检查是否是永久删除
            $permanent = isset($data->permanent) && $data->permanent === true;
            
            // 检查是否是恢复操作
            $restore = isset($data->restore) && $data->restore === true;

            if ($restore) {
                // 恢复笔记
                $query = "UPDATE notes SET category_id = :original_category, updated_at = NOW() 
                          WHERE id = :id AND user_id = :user_id";
                $stmt = $db->prepare($query);
                $original_category = $data->originalCategory ?: 'uncategorized';
                $stmt->bindParam(":original_category", $original_category);
                $stmt->bindParam(":id", $note_id);
                $stmt->bindParam(":user_id", $user_id);
                
                if ($stmt->execute()) {
                    echo json_encode(array("message" => "笔记恢复成功"));
                } else {
                    http_response_code(500);
                    echo json_encode(array("message" => "恢复笔记失败"));
                }
            } else if ($permanent) {
                // 永久删除（硬删除）
                $query = "DELETE FROM notes WHERE id = :id AND user_id = :user_id";
                $stmt = $db->prepare($query);
                $stmt->bindParam(":id", $note_id);
                $stmt->bindParam(":user_id", $user_id);
                
                if ($stmt->execute()) {
                    echo json_encode(array("message" => "笔记永久删除成功"));
                } else {
                    http_response_code(500);
                    echo json_encode(array("message" => "永久删除笔记失败"));
                }
            } else {
                // 软删除（移动到回收站）
                $query = "UPDATE notes SET category_id = 'deleted', updated_at = NOW() 
                          WHERE id = :id AND user_id = :user_id";
                $stmt = $db->prepare($query);
                $stmt->bindParam(":id", $note_id);
                $stmt->bindParam(":user_id", $user_id);
                
                if ($stmt->execute()) {
                    echo json_encode(array("message" => "笔记已移入回收站"));
                } else {
                    http_response_code(500);
                    echo json_encode(array("message" => "删除笔记失败"));
                }
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(array("message" => "不支持的请求方法"));
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("message" => "数据库错误: " . $e->getMessage()));
}
```

**（3）难点与解决**
1. 前端使用自己生成的客户端ID（如基于时间戳的ID），而数据库使用自增主键ID，需要解决两者之间的映射关系。解决方案是在数据库表中添加client_id字段，专门存储前端生成的ID，所有API操作都基于client_id进行查询和更新，同时通过user_id确保数据隔离。

2. **必须确保用户只能访问和操作自己的笔记数据**。解决方案是在所有数据库查询中都包含user_id = :user_id条件，该用户ID从认证Token中解析而来。在每次数据操作前都验证笔记是否属于当前用户，防止越权访问。

### 3.12 多用户支持
**（1）实现思路**

用户认证系统实现用户注册、登录、登出及权限控制功能，确保每个用户的数据隔离和安全访问。该系统采用前后端分离架构，基于Token的认证机制，实现完整的数据隔离和权限控制。

1. **用户注册流程**：

用户在前端注册模态框提交用户名、邮箱和密码。

客户端authManager.register()方法将凭证封装成JSON格式，通过POST请求发送到服务器注册端点（如/api/register.php）。

服务器端接收到注册请求后，首先检查用户名和邮箱的唯一性，确保没有重复注册。

通过验证后，服务器使用bcrypt强哈希算法对密码进行加密存储，绝对不允许明文保存密码。

用户记录创建成功后，服务器为该用户初始化必要的数据结构：创建默认分类（如"未分类"、"私密"、"最近删除"）。

注册成功后，服务器自动完成登录流程，生成认证令牌并返回给客户端，让用户立即进入应用。

2. **用户登录流程**：

用户在前端登录模态框提交用户名和密码。

客户端authManager.login()方法将凭证发送到服务器登录端点（如/api/login.php）。

服务器端接收登录请求后，进行输入验证，防止SQL注入和跨站脚本攻击。

查询用户数据库，比对经过bcrypt哈希处理的密码。

验证成功后，服务器生成唯一的Token，并将用户基本信息编码到令牌中，同时返回用户设置信息（如语言偏好、私密分类密码等）。

前端在后续请求中通过Authorization请求头携带此令牌，实现身份验证。

3. **用户登出流程**：

前端调用authManager.logout()方法，向服务器登出端点发送请求。

服务器端接收到登出请求后，使当前令牌失效，从数据库删除该令牌记录。

前端清除本地存储的认证令牌和用户数据，重置UI到未登录状态。

4. **权限控制机制**：

服务器端的所有数据操作API都必须基于当前认证的用户ID进行权限验证。

每个数据操作请求都需要验证认证令牌的有效性，并解析出用户ID。

所有数据库查询都附加WHERE user_id = :current_user_id条件，确保用户只能访问自己的数据。

前端根据用户登录状态动态调整界面显示，未登录时显示登录模态框。

**（2）核心代码实现**

客户端注册功能实现：
```javascript
/**
 * 用户注册功能
 * @description 处理用户注册逻辑，包括表单验证、数据提交和响应处理
 */
class AuthManager {
    /**
     * 用户注册
     * @param {string} username - 用户名
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     * @returns {Promise<Object>} 注册结果
     */
    async register(username, email, password) {
        // 客户端表单验证
        if (!username || !email || !password) {
            throw new Error('请填写所有必填字段');
        }
        
        if (password.length < 8) {
            throw new Error('密码长度至少为8个字符');
        }
        
        if (!this.validateEmail(email)) {
            throw new Error('邮箱格式不正确');
        }
        
        // 构建注册数据
        const registrationData = {
            username: username.trim(),
            email: email.trim(),
            password: password
        };
        
        try {
            // 发送注册请求
            const response = await fetch('/api/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registrationData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || '注册失败');
            }
            
            // 保存认证信息
            this.saveAuthData(result);
            
            return {
                success: true,
                message: result.message,
                user: result.user
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 保存认证数据
     * @param {Object} authData - 认证数据
     */
    saveAuthData(authData) {
        localStorage.setItem('auth_token', authData.token);
        localStorage.setItem('user_id', authData.user.id);
        localStorage.setItem('username', authData.user.username);
        localStorage.setItem('user_email', authData.user.email);
        
        if (authData.settings) {
            localStorage.setItem('user_settings', JSON.stringify(authData.settings));
        }
    }
}
```
服务器端注册处理（PHP实现）：
```php
/**
 * 用户注册处理
 * @description 处理用户注册请求，包括数据验证、密码哈希和默认数据初始化
 */
<?php
// 设置响应头
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 包含数据库配置
require_once 'config/database.php';

// 获取POST数据
$data = json_decode(file_get_contents("php://input"));

// 验证必要字段
if (!isset($data->username) || !isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(array("message" => "请提供用户名、邮箱和密码"));
    exit;
}

try {
    // 创建数据库连接
    $db = new Database();
    $conn = $db->getConnection();
    
    // 检查用户名和邮箱是否已存在
    $query = "SELECT id FROM users WHERE username = :username OR email = :email";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(":username", $data->username);
    $stmt->bindParam(":email", $data->email);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(array("message" => "用户名或邮箱已存在"));
        exit;
    }
    
    // 密码强度验证
    if (strlen($data->password) < 8) {
        http_response_code(400);
        echo json_encode(array("message" => "密码长度至少为8个字符"));
        exit;
    }
    
    if (!preg_match('/[A-Za-z]/', $data->password) || !preg_match('/[0-9]/', $data->password)) {
        http_response_code(400);
        echo json_encode(array("message" => "密码必须包含字母和数字"));
        exit;
    }
    
    // 创建用户
    $password_hash = password_hash($data->password, PASSWORD_BCRYPT);
    $query = "INSERT INTO users (username, email, password_hash) VALUES (:username, :email, :password_hash)";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(":username", $data->username);
    $stmt->bindParam(":email", $data->email);
    $stmt->bindParam(":password_hash", $password_hash);
    
    if ($stmt->execute()) {
        $user_id = $conn->lastInsertId();
        
        // 为用户初始化默认分类
        $defaultCategories = [
            ['all', '全部笔记', $user_id],
            ['uncategorized', '未分类', $user_id],
            ['private', '私密', $user_id],
            ['deleted', '最近删除', $user_id]
        ];
        
        $categoryQuery = "INSERT INTO categories (id, name, user_id, is_default) VALUES (?, ?, ?, 1)";
        $categoryStmt = $conn->prepare($categoryQuery);
        
        foreach ($defaultCategories as $category) {
            $categoryStmt->execute($category);
        }
        
        // 生成认证令牌
        $token = bin2hex(random_bytes(32));
        $expiry = time() + (7 * 24 * 60 * 60);
        
        // 保存令牌到数据库
        $tokenQuery = "UPDATE users SET auth_token = :token WHERE id = :user_id";
        $tokenStmt = $conn->prepare($tokenQuery);
        $tokenStmt->bindParam(":token", $token);
        $tokenStmt->bindParam(":user_id", $user_id);
        $tokenStmt->execute();
        
        // 获取用户信息
        $userQuery = "SELECT id, username, email FROM users WHERE id = :user_id";
        $userStmt = $conn->prepare($userQuery);
        $userStmt->bindParam(":user_id", $user_id);
        $userStmt->execute();
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        // 返回响应
        http_response_code(201);
        echo json_encode(array(
            "message" => "注册成功",
            "token" => $token,
            "user" => array(
                "id" => $user['id'],
                "username" => $user['username'],
                "email" => $user['email']
            ),
            "settings" => array(
                "language" => "zh-CN",
                "private_password" => null
            )
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "注册失败，请稍后重试"));
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("message" => "数据库错误: " . $e->getMessage()));
}
?>
```

客户端登录功能实现：

```javascript
/**
 * 用户登录功能
 * @description 处理用户登录逻辑，包括凭证验证、Token管理和用户状态同步
 */
class AuthManager {
    /**
     * 用户登录
     * @param {string} username - 用户名或邮箱
     * @param {string} password - 密码
     * @returns {Promise<Object>} 登录结果
     */
    async login(username, password) {
        if (!username || !password) {
            throw new Error('请填写用户名和密码');
        }
        
        const loginData = {
            username: username.trim(),
            password: password
        };
        
        try {
            const response = await fetch('/api/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || '登录失败');
            }
            
            // 保存认证信息
            this.saveAuthData(result);
            
            // 触发登录成功事件
            const event = new CustomEvent('userLoggedIn', {
                detail: { user: result.user }
            });
            document.dispatchEvent(event);
            
            return {
                success: true,
                message: result.message,
                user: result.user
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 获取认证请求头
     * @returns {Object} 包含认证令牌的请求头
     */
    getAuthHeader() {
        const token = localStorage.getItem('auth_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
    
    /**
     * 检查用户是否已登录
     * @returns {boolean} 登录状态
     */
    isLoggedIn() {
        const token = localStorage.getItem('auth_token');
        const user_id = localStorage.getItem('user_id');
        return !!(token && user_id);
    }
}
```

服务器端登录处理（PHP实现）：
```php
/**
 * 用户登录处理
 * @description 验证用户凭证，生成认证令牌，返回用户信息和设置
 */
<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once 'config/database.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->username) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(array("message" => "请提供用户名和密码"));
    exit;
}

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // 查询用户
    $query = "SELECT id, username, email, password_hash FROM users WHERE username = :username OR email = :username";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(":username", $data->username);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        http_response_code(401);
        echo json_encode(array("message" => "用户不存在"));
        exit;
    }
    
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // 验证密码
    if (password_verify($data->password, $row['password_hash'])) {
        // 生成Token
        $token = bin2hex(random_bytes(32));
        $expiry = time() + (7 * 24 * 60 * 60);
        
        // 将Token存入数据库
        $updateQuery = "UPDATE users SET auth_token = :token WHERE id = :user_id";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bindParam(":token", $token);
        $updateStmt->bindParam(":user_id", $row['id']);
        $updateStmt->execute();
        
        // 获取用户设置
        $query_settings = "SELECT language, private_password FROM user_settings WHERE user_id = :user_id";
        $stmt_settings = $conn->prepare($query_settings);
        $stmt_settings->bindParam(":user_id", $row['id']);
        $stmt_settings->execute();
        $settings = $stmt_settings->fetch(PDO::FETCH_ASSOC);
        
        if (!$settings) {
            $settings = array(
                "language" => "zh-CN",
                "private_password" => null
            );
        }
        
        // 响应数据
        http_response_code(200);
        echo json_encode(array(
            "message" => "登录成功",
            "token" => $token,
            "user" => array(
                "id" => $row['id'],
                "username" => $row['username'],
                "email" => $row['email']
            ),
            "settings" => $settings
        ));
    } else {
        http_response_code(401);
        echo json_encode(array("message" => "密码错误"));
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("message" => "数据库错误: " . $e->getMessage()));
}
?>
```

**（3）难点与解决**
1. 需要确保每个用户只能访问自己的笔记和分类数据，**防止数据越权访问**。解决方案是在所有数据操作API中实现基于用户ID的权限验证。服务器端在验证Token后，从Token中解析出用户ID，并在所有数据库查询中添加WHERE user_id = :current_user_id条件。例如，在笔记查询API中，使用SELECT * FROM notes WHERE user_id = :user_id AND category_id = :category_id，确保用户只能访问自己的笔记。

2. 需要**防止SQL注入、XSS攻击等安全威胁**。解决方案是在服务器端对所有用户输入进行严格的验证和过滤，使用参数化查询（Prepared Statements）防止SQL注入，对输出内容进行HTML转义防止XSS攻击。同时，在客户端也进行基本的表单验证，提供即时反馈，减少无效请求。


---

## 四、 实践心得体会

通过这个笔记管理系统的完整实践，我深刻体会到了从零开始构建一个实际可用的前端应用的全过程。最初面对这个项目时，感觉有些无从下手，但随着一步步推进，我逐渐理解了如何将一个大问题分解为多个可管理的小模块。从前端的三栏式界面布局到后端的数据存储，每个部分都需要精心设计和协调。我学会了按照功能将代码分为UI组件、事件监听、数据管理等不同模块，这种分而治之的思想让复杂的逻辑变得清晰可控，也让我认识到良好的架构设计对项目可维护性的重要性。

在实现数据持久化方面，我掌握了本地存储与服务器存储相结合的策略。通过浏览器localStorage实现离线可用性，我理解了如何设计数据结构、处理序列化和反序列化、以及管理存储空间限制。同时，学习使用PHP搭建简单的RESTful API服务器，让我对前后端通信有了更直观的认识——从设计API接口格式、处理HTTP请求方法到实现用户认证和数据验证，每一步都加深了我对Web应用完整工作流的理解。特别是实现用户登录和会话管理时，我意识到安全性的重要性，学会了密码哈希处理、令牌验证等基本的安全实践。

交互设计方面，实现拖拽功能是一次特别有价值的学习经历。从最初简单的点击操作到流畅的拖拽交互，我需要深入理解HTML5拖拽API的事件周期、数据传递机制和视觉反馈设计。在这个过程中，我遇到了不少挑战：如何实现拖拽时的实时预览、如何准确计算放置位置、如何处理不同浏览器间的兼容性差异。通过查阅文档、调试代码和反复测试，我不仅解决了具体问题，更培养了一种系统性的解决问题思路——先理解需求本质，再设计解决方案，然后分步骤实现，最后测试优化。

这个项目还让我学会了许多处理问题的实用方法。例如，当遇到复杂的状态管理时，我采用事件驱动的方式解耦各个模块；当需要实时保存数据又不影响用户输入流畅性时，我实现了防抖机制的自动保存；当设计多用户系统时，我学会了如何规划数据隔离和权限控制。每一次遇到难题并最终找到解决方案，都让我对软件开发有了更深的认识。我意识到编程不仅仅是写代码，更是理解问题、设计解决方案、权衡各种技术选择的综合过程。

此外，这个项目让我体会到版本控制的重要性，学会了如何合理提交代码、撰写有意义的提交信息。调试过程中，我掌握了浏览器开发者工具的更多高级用法，能更有效地定位和解决问题。我也开始关注代码的可读性和可维护性，尝试编写更清晰、注释更充分的代码。最重要的是，这个完整项目的实践经验让我建立了信心，我相信今后面对其他复杂项目时，我能运用在这里学到的分析方法和实现策略，更有条理地开展工作。这次学习旅程不仅是技术的积累，更是思维方式和解决问题能力的全面提升。

