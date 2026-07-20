// ==UserScript==
// @name         QZone auto like
// @namespace    http://tampermonkey.net/
// @version      2026-07-19
// @description  try to take over the world!
// @author       You
// @match        https://user.qzone.qq.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=i.qq.com
// @grant        none
// ==/UserScript==
import ConfigDialog from "./ConfigDialog";
import { merge } from "lodash-es";
const config = {
    like: {
        enable: false,
        refresh: 2000,
    },
    comment: {
        enable: false,
        text: "[自动评论]泥壕！"
    },
    autoScroll: {
        enable: false,
        delta: 10,
    }
};
const i18n = {
    'like': '点赞配置',
    'comment': '评论配置',
    'like.enable': '启用自动点赞',
    "like.refresh": "重新检测间隔（ms）",
    'comment.enable': '启用自动评论',
    'comment.text': '评论内容',
    "autoScroll": "自动滚动",
    "autoScroll.enable": "启用自动滚动",
    "autoScroll.delta": "每10ms滚动距离(px)",
};
const config_raw = localStorage.getItem("AutoLike_Config");

if (config_raw != null) {
    merge(config, JSON.parse(config_raw))
}

function setupConfigButton() {
    const e = document.createElement("a");
    e.innerText = "自动点赞设置"
    e.href = "javascript:;";
    e.onclick = function () {
        window.scrollTo(0, 0);
        const apps = document.querySelector("#pageContent")?.parentElement?.children as (null | (HTMLCollection & {
            pageApp: HTMLElement,
            pageContent: HTMLElement,
            page3rdApp: HTMLElement
        }));
        if (apps == null) return;
        apps.pageApp.classList.add("none");
        apps.pageContent.classList.add("none");
        apps.page3rdApp.classList.remove("none");
        const app = apps.page3rdApp;
        const div = document.createElement("div");
        app.innerHTML = "";
        app.append(div);
        const configDialog = new ConfigDialog({
            container: div,
            config: config,
            i18n: i18n,
            rootTitle: '自动点赞设置',
            onUpdate: (path, newVal, oldVal) => {
                console.log(`配置变更: ${path.join('.')} 从 ${oldVal} 变为 ${newVal}`);
                let current: any = config;
                for (var i = 0; i < path.length - 1; i++) {
                    current = current[path[i]];
                }
                current[path[path.length - 1]] = newVal;
                console.log(config);
                localStorage.setItem("AutoLike_Config", JSON.stringify(config));
            }
        });
        configDialog.open();
    }
    e.classList.add("no-op-input-checkpoint");
    return e;
}
function attachConfigButton(button: HTMLElement) {
    if (document.querySelector(".no-op-input-checkpoint")) return;
    document.querySelector("#tb_setting_panel>.drop-down-setting")?.append(button);
    setTimeout(() => attachConfigButton(button), 5);
}
function act_it() {
    setTimeout(act_it, config.like.refresh);
    const element_list = document.querySelectorAll<HTMLDivElement>(".f-single.f-s-s:not(.f-single-biz):not([data-seen])");
    element_list.forEach((frame) => {
        frame.dataset.seen = "true"
    })
    if (config.like.enable) {
        element_list.forEach((frame) => {
            const praise_btn = frame.querySelector<HTMLAnchorElement>("i.fui-icon.icon-op-praise")
            if (!praise_btn) return;
            if (praise_btn.parentElement?.classList.contains("item-on")) return;
            praise_btn.click();
        });
    }
    if (config.comment.enable) {
        element_list.forEach((frame) => {
            if (Array.from(frame.querySelectorAll(".comments-content")).reduce((prev, curr) => (prev || (curr.childNodes.item(1)?.nodeValue?.replace(":", "").trim().includes(config.comment.text) == true)), false)) {
                return;
            }
            console.log("追加评论")
            frame.querySelector<HTMLElement>("i.fui-icon.icon-op-comment")?.click();
            const area = frame.querySelector<HTMLElement>("div.textinput.textarea.c_tx2");
            if (area)
                area.innerText = config.comment.text;
            frame.querySelector<HTMLElement>("a.btn-post.gb_bt.evt_click")?.click();
        });
    }
}


function autoScroll() {
    if (config.autoScroll.enable && !document.querySelector("#pageContent")?.classList.contains("none")) {
        window.scrollTo(window.scrollX, window.scrollY + config.autoScroll.delta);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(act_it, 100);
    setTimeout(() => attachConfigButton(setupConfigButton()), 5)
    setInterval(autoScroll, 10)
})