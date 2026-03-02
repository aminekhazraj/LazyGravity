import {
    toDiscordPayload,
    toDiscordButtonStyle,
    wrapDiscordUser,
    wrapDiscordSentMessage,
    wrapDiscordChannel,
    wrapDiscordMessage,
} from '../../../src/platform/discord/wrappers';

import {
    ButtonStyle as DiscordButtonStyle,
    EmbedBuilder,
    AttachmentBuilder,
    MessageFlags,
} from 'discord.js';

import type { MessagePayload, ButtonStyle, RichContent } from '../../../src/platform/types';

// ---------------------------------------------------------------------------
// Helpers: create minimal discord.js-like mock objects
// ---------------------------------------------------------------------------

function createMockUser(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: '111',
        username: 'TestUser',
        displayName: 'Test Display',
        bot: false,
        ...overrides,
    };
}

function createMockMessage(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 'msg-1',
        content: 'hello',
        channelId: 'ch-1',
        createdAt: new Date('2024-06-01T00:00:00Z'),
        author: createMockUser(),
        channel: {
            id: 'ch-1',
            name: 'general',
            send: jest.fn().mockResolvedValue({
                id: 'sent-1',
                channelId: 'ch-1',
                edit: jest.fn(),
                delete: jest.fn(),
            }),
        },
        attachments: new Map(),
        react: jest.fn().mockResolvedValue(undefined),
        reply: jest.fn().mockResolvedValue({
            id: 'reply-1',
            channelId: 'ch-1',
            edit: jest.fn(),
            delete: jest.fn(),
        }),
        edit: jest.fn().mockResolvedValue({
            id: 'msg-1',
            channelId: 'ch-1',
            edit: jest.fn(),
            delete: jest.fn(),
        }),
        delete: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// toDiscordButtonStyle
// ---------------------------------------------------------------------------

describe('toDiscordButtonStyle', () => {
    it('maps "primary" to DiscordButtonStyle.Primary', () => {
        expect(toDiscordButtonStyle('primary')).toBe(DiscordButtonStyle.Primary);
    });

    it('maps "secondary" to DiscordButtonStyle.Secondary', () => {
        expect(toDiscordButtonStyle('secondary')).toBe(DiscordButtonStyle.Secondary);
    });

    it('maps "success" to DiscordButtonStyle.Success', () => {
        expect(toDiscordButtonStyle('success')).toBe(DiscordButtonStyle.Success);
    });

    it('maps "danger" to DiscordButtonStyle.Danger', () => {
        expect(toDiscordButtonStyle('danger')).toBe(DiscordButtonStyle.Danger);
    });
});

// ---------------------------------------------------------------------------
// toDiscordPayload
// ---------------------------------------------------------------------------

describe('toDiscordPayload', () => {
    it('converts text-only payload', () => {
        const payload: MessagePayload = { text: 'Hello world' };
        const result = toDiscordPayload(payload);

        expect(result.content).toBe('Hello world');
        expect(result.embeds).toBeUndefined();
        expect(result.components).toBeUndefined();
        expect(result.files).toBeUndefined();
        expect(result.flags).toBeUndefined();
    });

    it('converts richContent to EmbedBuilder', () => {
        const rc: RichContent = {
            title: 'Test Title',
            description: 'Test Desc',
            color: 0xFF0000,
            fields: [{ name: 'F1', value: 'V1', inline: true }],
            footer: 'foot text',
            timestamp: new Date('2024-01-01T00:00:00Z'),
            thumbnailUrl: 'https://example.com/thumb.png',
            imageUrl: 'https://example.com/img.png',
        };
        const payload: MessagePayload = { richContent: rc };
        const result = toDiscordPayload(payload);

        expect(result.embeds).toBeDefined();
        expect(Array.isArray(result.embeds)).toBe(true);
        const embeds = result.embeds as EmbedBuilder[];
        expect(embeds).toHaveLength(1);

        const embedData = embeds[0].toJSON();
        expect(embedData.title).toBe('Test Title');
        expect(embedData.description).toBe('Test Desc');
        expect(embedData.color).toBe(0xFF0000);
        expect(embedData.fields).toEqual([{ name: 'F1', value: 'V1', inline: true }]);
        expect(embedData.footer).toEqual({ text: 'foot text' });
        expect(embedData.timestamp).toBe('2024-01-01T00:00:00.000Z');
        expect(embedData.thumbnail).toEqual({ url: 'https://example.com/thumb.png' });
        expect(embedData.image).toEqual({ url: 'https://example.com/img.png' });
    });

    it('converts components with buttons', () => {
        const payload: MessagePayload = {
            components: [
                {
                    components: [
                        { type: 'button', customId: 'btn-1', label: 'Click', style: 'primary' as ButtonStyle },
                        { type: 'button', customId: 'btn-2', label: 'Cancel', style: 'danger' as ButtonStyle, disabled: true },
                    ],
                },
            ],
        };
        const result = toDiscordPayload(payload);

        expect(result.components).toBeDefined();
        const rows = result.components as Array<{ components: unknown[] }>;
        expect(rows).toHaveLength(1);

        const rowJson = (rows[0] as unknown as { toJSON: () => Record<string, unknown> }).toJSON();
        const components = rowJson.components as Array<Record<string, unknown>>;
        expect(components).toHaveLength(2);
        expect(components[0]).toMatchObject({
            custom_id: 'btn-1',
            label: 'Click',
            style: DiscordButtonStyle.Primary,
        });
        expect(components[1]).toMatchObject({
            custom_id: 'btn-2',
            label: 'Cancel',
            style: DiscordButtonStyle.Danger,
            disabled: true,
        });
    });

    it('converts components with select menu', () => {
        const payload: MessagePayload = {
            components: [
                {
                    components: [
                        {
                            type: 'selectMenu' as const,
                            customId: 'select-1',
                            placeholder: 'Choose...',
                            options: [
                                { label: 'Opt A', value: 'a', description: 'First' },
                                { label: 'Opt B', value: 'b', isDefault: true },
                            ],
                        },
                    ],
                },
            ],
        };
        const result = toDiscordPayload(payload);

        const rows = result.components as Array<{ toJSON: () => Record<string, unknown> }>;
        expect(rows).toHaveLength(1);
        const rowJson = rows[0].toJSON();
        const components = rowJson.components as Array<Record<string, unknown>>;
        expect(components).toHaveLength(1);
        expect(components[0]).toMatchObject({
            custom_id: 'select-1',
            placeholder: 'Choose...',
        });
    });

    it('converts files to AttachmentBuilder[]', () => {
        const payload: MessagePayload = {
            files: [
                { name: 'test.txt', data: Buffer.from('hello'), contentType: 'text/plain' },
            ],
        };
        const result = toDiscordPayload(payload);

        expect(result.files).toBeDefined();
        const files = result.files as AttachmentBuilder[];
        expect(files).toHaveLength(1);
        expect(files[0]).toBeInstanceOf(AttachmentBuilder);
    });

    it('sets ephemeral flag with MessageFlags.Ephemeral', () => {
        const payload: MessagePayload = { text: 'secret', ephemeral: true };
        const result = toDiscordPayload(payload);

        expect(result.flags).toBe(MessageFlags.Ephemeral);
    });

    it('does not set flags when ephemeral is false', () => {
        const payload: MessagePayload = { text: 'public', ephemeral: false };
        const result = toDiscordPayload(payload);

        expect(result.flags).toBeUndefined();
    });

    it('handles empty components array gracefully', () => {
        const payload: MessagePayload = { text: 'hi', components: [] };
        const result = toDiscordPayload(payload);

        expect(result.components).toBeUndefined();
    });

    it('handles empty files array gracefully', () => {
        const payload: MessagePayload = { text: 'hi', files: [] };
        const result = toDiscordPayload(payload);

        expect(result.files).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// wrapDiscordUser
// ---------------------------------------------------------------------------

describe('wrapDiscordUser', () => {
    it('converts a discord.js User to a PlatformUser', () => {
        const user = createMockUser();
        const result = wrapDiscordUser(user as any);

        expect(result).toEqual({
            id: '111',
            platform: 'discord',
            username: 'TestUser',
            displayName: 'Test Display',
            isBot: false,
        });
    });

    it('handles bot users', () => {
        const user = createMockUser({ bot: true });
        const result = wrapDiscordUser(user as any);

        expect(result.isBot).toBe(true);
    });

    it('handles null displayName gracefully', () => {
        const user = createMockUser({ displayName: null });
        const result = wrapDiscordUser(user as any);

        expect(result.displayName).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// wrapDiscordSentMessage
// ---------------------------------------------------------------------------

describe('wrapDiscordSentMessage', () => {
    it('wraps id, platform, and channelId', () => {
        const msg = createMockMessage();
        const result = wrapDiscordSentMessage(msg as any);

        expect(result.id).toBe('msg-1');
        expect(result.platform).toBe('discord');
        expect(result.channelId).toBe('ch-1');
    });

    it('edit() delegates to the underlying message.edit()', async () => {
        const msg = createMockMessage();
        const wrapped = wrapDiscordSentMessage(msg as any);

        const editPayload: MessagePayload = { text: 'edited' };
        const editResult = await wrapped.edit(editPayload);

        expect(msg.edit).toHaveBeenCalledTimes(1);
        const callArg = (msg.edit as jest.Mock).mock.calls[0][0];
        expect(callArg.content).toBe('edited');
        expect(editResult.platform).toBe('discord');
    });

    it('delete() delegates to the underlying message.delete()', async () => {
        const msg = createMockMessage();
        const wrapped = wrapDiscordSentMessage(msg as any);

        await wrapped.delete();

        expect(msg.delete).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// wrapDiscordChannel
// ---------------------------------------------------------------------------

describe('wrapDiscordChannel', () => {
    it('wraps id, platform, and name', () => {
        const channel = { id: 'ch-1', name: 'general', send: jest.fn() };
        const result = wrapDiscordChannel(channel as any);

        expect(result.id).toBe('ch-1');
        expect(result.platform).toBe('discord');
        expect(result.name).toBe('general');
    });

    it('send() converts payload and delegates to channel.send()', async () => {
        const sentMsg = createMockMessage({ id: 'sent-42' });
        const channel = { id: 'ch-1', name: 'test', send: jest.fn().mockResolvedValue(sentMsg) };
        const wrapped = wrapDiscordChannel(channel as any);

        const result = await wrapped.send({ text: 'hello' });

        expect(channel.send).toHaveBeenCalledTimes(1);
        const callArg = channel.send.mock.calls[0][0];
        expect(callArg.content).toBe('hello');
        expect(result.id).toBe('sent-42');
        expect(result.platform).toBe('discord');
    });
});

// ---------------------------------------------------------------------------
// wrapDiscordMessage
// ---------------------------------------------------------------------------

describe('wrapDiscordMessage', () => {
    it('wraps all message properties', () => {
        const msg = createMockMessage();
        const result = wrapDiscordMessage(msg as any);

        expect(result.id).toBe('msg-1');
        expect(result.platform).toBe('discord');
        expect(result.content).toBe('hello');
        expect(result.author.id).toBe('111');
        expect(result.channel.id).toBe('ch-1');
        expect(result.attachments).toEqual([]);
        expect(result.createdAt).toEqual(new Date('2024-06-01T00:00:00Z'));
    });

    it('wraps attachments from the message', () => {
        const attachments = new Map([
            ['att-1', { name: 'file.txt', contentType: 'text/plain', url: 'https://cdn.example.com/file.txt', size: 1024 }],
        ]);
        const msg = createMockMessage({ attachments });
        const result = wrapDiscordMessage(msg as any);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0]).toEqual({
            name: 'file.txt',
            contentType: 'text/plain',
            url: 'https://cdn.example.com/file.txt',
            size: 1024,
        });
    });

    it('react() delegates to message.react()', async () => {
        const msg = createMockMessage();
        const wrapped = wrapDiscordMessage(msg as any);

        await wrapped.react('thumbsup');

        expect(msg.react).toHaveBeenCalledWith('thumbsup');
    });

    it('reply() converts payload and delegates to message.reply()', async () => {
        const msg = createMockMessage();
        const wrapped = wrapDiscordMessage(msg as any);

        const result = await wrapped.reply({ text: 'reply text' });

        expect(msg.reply).toHaveBeenCalledTimes(1);
        const callArg = (msg.reply as jest.Mock).mock.calls[0][0];
        expect(callArg.content).toBe('reply text');
        expect(result.id).toBe('reply-1');
    });
});
