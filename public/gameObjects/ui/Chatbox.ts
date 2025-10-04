import Phaser from "phaser";
import { Draggable } from "./Draggable";
import { PacketType } from "../../../common/PacketType";
import { container } from "tsyringe";
import { NetworkManager } from "../../network/NetworkManager";
import { Resizable } from "./Resizable";
import { CameraFocusManager } from "../../gameObjects/CameraFocusManager";

export default class Chatbox {
    private dom: Phaser.GameObjects.DOMElement;
    private listContainer: HTMLElement;
    private MAX_LENGTH: number = 60;
    private isChatFocussed = false;

    constructor(scene: Phaser.Scene) {
        this.dom = scene.add.dom(50, scene.sys.canvas.height*0.60).createFromCache("phaserChatbox");
        this.dom.setOrigin(0, 0);
        this.dom.setDepth(10001);

        const chatInput = this.dom.getChildByID("phaser-chatbox-input") as HTMLInputElement | null;
        const chatSendBtn = this.dom.getChildByID("phaser-chatbox-send") as HTMLButtonElement | null;
        const chatboxBody = this.dom.getChildByID("phaser-chatbox-body") as HTMLDivElement | null;
        const chatboxMinBtn = this.dom.getChildByID("phaser-chatbox-min-btn") as HTMLButtonElement | null;
        
        chatInput && chatSendBtn?.addEventListener("click", (_) => this.sendChat(chatInput));

        const node = this.dom.node as HTMLElement;
        this.listContainer = node.querySelector("#leaderboard-list") as HTMLElement;

        // --- Minimize/maximize logic ---
        if (chatboxMinBtn && chatboxBody) {
            chatboxMinBtn.addEventListener("click", () => {
                if (chatboxBody.style.display === "none") {
                    chatboxBody.style.display = "flex";
                    chatboxMinBtn.textContent = "–";
                } else {
                    chatboxBody.style.display = "none";
                    chatboxMinBtn.textContent = "+";
                }
            });
        }

        if (!chatInput)
            return;

        chatInput.addEventListener("focus", () => {
            this.isChatFocussed = true;
        });

        chatInput.addEventListener("blur", () => {
            this.isChatFocussed = false;
        });

        chatInput.addEventListener("keydown", (e) => {
            // Prevent propagation so space and other keys work in chat
            e.stopPropagation();
            if (e.key === "Enter") {
                const networkManager = container.resolve(NetworkManager);
                if (!chatInput) return;
                let value = chatInput.value.trim();
                if (!value) return;
                if (value.length > this.MAX_LENGTH) value = value.slice(0, this.MAX_LENGTH);
                networkManager.sendEventToServer(PacketType.ByClient.CLIENT_SENT_CHAT, { message: value });
                chatInput.value = "";

            }
        });
        
        // Attach draggable behavior
        new Draggable(scene, this.dom, "#phaser-chatbox-header");

        // Resizable
        new Resizable(scene, this.dom, "#phaser-chatbox-resize", { minW: 220, maxW: 600, minH: 80, maxH: 400 });

        // Adjust messages area when resized
        const chatMessages = this.dom.getChildByID("phaser-chatbox-messages") as HTMLDivElement | null;
        const chatboxHeader = this.dom.getChildByID("phaser-chatbox-header") as HTMLDivElement | null;
        (this.dom.node as HTMLElement).addEventListener("resized", (e: any) => {
            if (!chatMessages) return;
            const { height } = e.detail;
            const headerH = chatboxHeader ? chatboxHeader.offsetHeight : 32;
            const inputRowH = chatInput ? chatInput.offsetHeight + 16 : 40;
            chatMessages.style.height = Math.max(40, height - headerH - inputRowH - 40) + "px";
        });
    }

    appendSystemMessage(msg: string, type: "info" | "warning" | "error" = "info") {
        const chatMessages = this.dom.getChildByID("phaser-chatbox-messages") as HTMLDivElement | null;
        if (!chatMessages) return;

        const div = document.createElement("div");
        div.classList.add("system-message", type);
        div.innerText = msg;

        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }


    sendChat(chatInput: HTMLInputElement) {
        if (!chatInput) return;
        let value = chatInput.value.trim();
        if (!value) return;
        if (value.length > this.MAX_LENGTH) value = value.slice(0, this.MAX_LENGTH);
        const networkManager = container.resolve(NetworkManager);
        networkManager.sendEventToServer(PacketType.ByClient.CLIENT_SENT_CHAT, { message: value });
        chatInput.value = "";
    }
    appendChatMessage(scene: Phaser.Scene, msg: string, senderId: string) {
        const chatMessages = this.dom.getChildByID("phaser-chatbox-messages") as HTMLDivElement | null;
        if (!chatMessages) return;

        // if player not found, assume it to be sent by system
        let senderPlayer = container.resolve(NetworkManager).getState()?.players.get(senderId);
        const senderName = senderPlayer?.name || '[SYSTEM]';

        const div = document.createElement("div");
        div.innerHTML = `<b>${senderName}:</b> ${msg}`;
        
        if(senderName !== '[SYSTEM]')
            div.addEventListener('click', () => {
                container.resolve(CameraFocusManager).focusOnEntity(scene, senderId, 100);
            })

        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    public isChatActive() {
        return this.isChatFocussed;
    }
    public getDom(): Phaser.GameObjects.DOMElement {
        return this.dom;
    }
}
