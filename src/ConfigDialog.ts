import style_txt from "./style.css?raw"

/**
 * 配置叶子节点结构
 */
interface Leaf {
    path: string[];
    value: any;
}

/**
 * 配置分组结构
 */
type GroupedLeaves = Record<string, Leaf[]>;

/**
 * ConfigDialog 构造选项
 */
interface ConfigDialogOptions<T extends Record<string, any> = Record<string, any>> {
    container: HTMLElement;
    config: T;
    i18n?: Record<string, string>;
    rootTitle?: string;
    onUpdate?: (path: string[], newValue: any, oldValue: any) => void;
}

/**
 * 配置面板类（Shadow DOM 封装，直接编辑）
 */
class ConfigDialog<T extends Record<string, any> = Record<string, any>> {
    public container: HTMLElement;
    public config: T;
    public i18n: Record<string, string>;
    public rootTitle: string;
    public onUpdate?: (path: string[], newValue: any, oldValue: any) => void;

    private _root: ShadowRoot | null = null;
    private _currentGroup: string | null = null;
    private _groups: GroupedLeaves = {};
    private _contentEl: HTMLElement | null = null;
    private _sidebarEl: HTMLElement | null = null;
    private _isOpen: boolean = false;

    constructor(options: ConfigDialogOptions<T>) {
        const { container, config, i18n = {}, rootTitle = '配置菜单', onUpdate } = options;
        if (!container) throw new Error('container 参数必须提供');
        if (!config || typeof config !== 'object') throw new Error('config 必须是对象');

        this.container = container;
        this.config = config;
        this.i18n = { ...i18n };
        this.rootTitle = rootTitle;
        this.onUpdate = onUpdate;

        this.i18n['__root'] = this.i18n['__root'] || this.rootTitle;

        if (!container.shadowRoot) {
            container.attachShadow({ mode: 'open' });
        }
        this._root = container.shadowRoot;

        this._prepareData();
        container.style.display = 'none';
    }

    // ---------- 私有方法 ----------
    private _getI18n(pathArray: string[], fallback: string): string {
        const key = pathArray.join('.');
        return this.i18n[key] || fallback;
    }

    private _setValue(path: string[], newValue: any): void {
        let target: any = this.config;
        for (let i = 0; i < path.length - 1; i++) {
            target = target[path[i]];
        }
        const key = path[path.length - 1];
        const oldValue = target[key];
        if (oldValue === newValue) return;
        target[key] = newValue;
        if (typeof this.onUpdate === 'function') {
            try {
                this.onUpdate(path, newValue, oldValue);
            } catch (err) {
                console.error('ConfigDialog onUpdate 钩子执行出错:', err);
            }
        }
    }

    private _collectLeaves(obj: any, prefix: string[] = []): Leaf[] {
        let leaves: Leaf[] = [];
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            const currentPath = prefix.concat(key);
            if (typeof val === 'object' && val !== null) {
                const sub = this._collectLeaves(val, currentPath);
                leaves = leaves.concat(sub);
            } else {
                leaves.push({ path: currentPath, value: val });
            }
        }
        return leaves;
    }

    private _groupLeaves(leaves: Leaf[]): GroupedLeaves {
        const groups: GroupedLeaves = {};
        for (const leaf of leaves) {
            const firstKey = leaf.path[0];
            if (!groups[firstKey]) groups[firstKey] = [];
            groups[firstKey].push(leaf);
        }
        return groups;
    }

    private _prepareData(): void {
        const leaves = this._collectLeaves(this.config);
        this._groups = this._groupLeaves(leaves);
        const firstKey = Object.keys(this._groups)[0] || null;
        this._currentGroup = firstKey;
    }

    private render(): void {
        const root = this._root;
        if (!root) return;
        root.innerHTML = '';

        const style = document.createElement('style');
        style.textContent = style_txt;
        root.appendChild(style);

        const wrapper = document.createElement('div');
        wrapper.className = 'cfg-wrapper';

        const sidebar = document.createElement('div');
        sidebar.className = 'cfg-sidebar';
        const title = document.createElement('div');
        title.className = 'cfg-sidebar-title';
        title.textContent = this._getI18n(['__root'], '配置菜单');
        sidebar.appendChild(title);

        const menuList = document.createElement('div');
        for (const groupKey of Object.keys(this._groups)) {
            const item = document.createElement('div');
            item.className = 'cfg-menu-item';
            if (groupKey === this._currentGroup) item.classList.add('active');
            item.textContent = this._getI18n([groupKey], groupKey);
            item.dataset.group = groupKey;
            item.addEventListener('click', () => {
                this._currentGroup = groupKey;
                this._renderContent();
                // 更新高亮
                const allItems = this._sidebarEl?.querySelectorAll('.cfg-menu-item') as NodeListOf<HTMLElement>;
                allItems.forEach(el => {
                    el.classList.toggle('active', el.dataset.group === groupKey);
                });
            });
            menuList.appendChild(item);
        }
        sidebar.appendChild(menuList);
        wrapper.appendChild(sidebar);
        this._sidebarEl = sidebar;

        const content = document.createElement('div');
        content.className = 'cfg-content';
        wrapper.appendChild(content);
        this._contentEl = content;

        root.appendChild(wrapper);
        this._renderContent();
    }

    private _renderContent(): void {
        const content = this._contentEl;
        if (!content) return;
        content.innerHTML = '';

        const groupKey = this._currentGroup;
        if (!groupKey || !this._groups[groupKey]) {
            const empty = document.createElement('div');
            empty.className = 'cfg-empty';
            empty.textContent = '请选择一个分类';
            content.appendChild(empty);
            return;
        }

        const items = this._groups[groupKey];
        items.sort((a, b) => a.path.join('.') > b.path.join('.') ? 1 : -1);

        const header = document.createElement('div');
        header.className = 'cfg-content-header';
        header.textContent = this._getI18n([groupKey], groupKey);
        content.appendChild(header);

        const list = document.createElement('div');
        list.className = 'cfg-list';

        for (const leaf of items) {
            const row = document.createElement('div');
            row.className = 'cfg-row';

            const label = document.createElement('span');
            label.className = 'cfg-label';
            label.textContent = this._getI18n(leaf.path, leaf.path.slice(-1)[0]);

            const control = document.createElement('div');
            control.className = 'cfg-control';

            const path = leaf.path;
            const currentValue = leaf.value;

            if (typeof currentValue === 'boolean') {
                const toggle = document.createElement('label');
                toggle.className = 'cfg-toggle';
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = currentValue;
                input.addEventListener('change', () => {
                    const newVal = input.checked;
                    this._setValue(path, newVal);
                    leaf.value = newVal;
                });
                const slider = document.createElement('span');
                slider.className = 'slider';
                toggle.appendChild(input);
                toggle.appendChild(slider);
                control.appendChild(toggle);
            } else if (typeof currentValue === 'string') {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'cfg-input';
                input.value = currentValue;
                input.addEventListener('input', () => {
                    const newVal = input.value;
                    this._setValue(path, newVal);
                    leaf.value = newVal;
                });
                control.appendChild(input);
            } else if (typeof currentValue === 'number') {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'cfg-input';
                input.value = currentValue.toString();
                input.step = 'any';
                input.addEventListener('input', () => {
                    const val = parseFloat(input.value);
                    if (!isNaN(val)) {
                        this._setValue(path, val);
                        leaf.value = val;
                    }
                });
                control.appendChild(input);
            } else {
                const span = document.createElement('span');
                span.className = 'cfg-value-text';
                span.textContent = String(currentValue);
                control.appendChild(span);
            }

            row.appendChild(label);
            row.appendChild(control);
            list.appendChild(row);
        }

        content.appendChild(list);
    }

    // ---------- 公开 API ----------
    public open(): void {
        this.container.style.display = 'block';
        this._isOpen = true;
        if (this._root && this._root.children.length === 0) {
            this.render();
        }
    }

    public close(): void {
        this.container.style.display = 'none';
        this._isOpen = false;
    }

    public toggle(): void {
        if (this._isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    public refresh(): void {
        this._prepareData();
        this.render();
    }

    public destroy(): void {
        this.close();
        if (this._root) {
            this._root.innerHTML = '';
        }
        this._isOpen = false;
        this._contentEl = null;
        this._sidebarEl = null;
        this._groups = {};
        this._currentGroup = null;
    }
}

// ========== 导出 ==========
export default ConfigDialog;
export type { ConfigDialogOptions, Leaf, GroupedLeaves };
export { ConfigDialog };