import React, { useEffect, useMemo, useRef, useState } from "react";

const ADMIN_CONVERSATION_PAGE_SIZE = 50;
const ADMIN_CHAT_WINDOW_SIZE = 100;
const ADMIN_CHAT_WINDOW_STEP = 100;

export function SupportChatPage({
  apiBase,
  token,
  fetchApi,
  PageHeader,
  PageState,
  miniStat,
  formatDate,
  formatRelativeAge,
  isOlderThanMinutes,
  supportCannedReplies,
  supportConversationsRefreshMs,
  supportMessagesRefreshMs
}) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conversations, setConversations] = useState([]);
  const [conversationMeta, setConversationMeta] = useState({ total: 0, offset: 0, limit: ADMIN_CONVERSATION_PAGE_SIZE, hasMore: false });
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageWindowSize, setMessageWindowSize] = useState(ADMIN_CHAT_WINDOW_SIZE);
  const [messageMeta, setMessageMeta] = useState({ totalCount: 0, hasOlder: false, limit: ADMIN_CHAT_WINDOW_SIZE });
  const [olderBusy, setOlderBusy] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [inboxFilter, setInboxFilter] = useState("all");
  const messagesRef = useRef(null);

  function normalizeConversationListResponse(data) {
    const items = Array.isArray(data) ? data : Array.isArray(data?.conversations) ? data.conversations : Array.isArray(data?.items) ? data.items : [];
    const pagination = data?.pagination || {};
    return {
      items,
      pagination: {
        total: Number(pagination.total || items.length || 0),
        offset: Number(pagination.offset || 0),
        limit: Number(pagination.limit || ADMIN_CONVERSATION_PAGE_SIZE),
        hasMore: Boolean(pagination.hasMore)
      }
    };
  }

  useEffect(() => {
    let active = true;
    const normalizedSearch = search.trim();

    async function loadConversations(showLoader = false, preferredConversationId = "", options = {}) {
      if (showLoader) {
        setLoading(true);
      }
      try {
        const query = new URLSearchParams({
          limit: String(options.limit || ADMIN_CONVERSATION_PAGE_SIZE),
          offset: String(options.offset || 0),
          filter: options.filter || inboxFilter,
          search: options.search ?? normalizedSearch
        });
        const data = await fetchApi(apiBase, `/api/admin/chat-conversations?${query.toString()}`, token);
        if (!active) return;
        const normalizedResponse = normalizeConversationListResponse(data);
        const nextConversations = normalizedResponse.items;
        setConversations(nextConversations);
        setConversationMeta(normalizedResponse.pagination);
        setSelectedId((current) => {
          if (preferredConversationId && nextConversations.some((conversation) => conversation.id === preferredConversationId)) {
            return preferredConversationId;
          }
          if (current && nextConversations.some((conversation) => conversation.id === current)) {
            return current;
          }
          return nextConversations[0]?.id || "";
        });
        setError("");
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message);
      } finally {
        if (active && showLoader) {
          setLoading(false);
        }
      }
    }

    loadConversations(true, "", { limit: ADMIN_CONVERSATION_PAGE_SIZE, offset: 0, filter: inboxFilter, search: normalizedSearch });
    const timer = window.setInterval(
      () => loadConversations(false, selectedId, { limit: conversationMeta.limit || ADMIN_CONVERSATION_PAGE_SIZE, offset: 0, filter: inboxFilter, search: normalizedSearch }),
      supportConversationsRefreshMs
    );

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [apiBase, conversationMeta.limit, fetchApi, inboxFilter, search, selectedId, supportConversationsRefreshMs, token]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setMessageMeta({ totalCount: 0, hasOlder: false, limit: ADMIN_CHAT_WINDOW_SIZE });
      setLoading(false);
      return;
    }

    let active = true;

    async function loadMessages(showLoader = false, limitOverride = messageWindowSize) {
      if (showLoader) {
        setLoading(true);
      }
      try {
        const query = new URLSearchParams({ conversationId: selectedId, limit: String(limitOverride) });
        const data = await fetchApi(apiBase, `/api/admin/chat-messages?${query.toString()}`, token);
        if (!active) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setMessageMeta({
          totalCount: Number(data.pagination?.totalCount || (Array.isArray(data.messages) ? data.messages.length : 0)),
          hasOlder: Boolean(data.pagination?.hasOlder),
          limit: Number(data.pagination?.limit || limitOverride || ADMIN_CHAT_WINDOW_SIZE)
        });
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedId
              ? {
                  ...conversation,
                  unreadForAdmin: 0,
                  lastMessageAt: data.conversation?.lastMessageAt || conversation.lastMessageAt
                }
              : conversation
          )
        );
        setError("");
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message);
      } finally {
        if (active && showLoader) {
          setLoading(false);
        }
      }
    }

    loadMessages(true, messageWindowSize);
    const timer = window.setInterval(() => loadMessages(false, messageWindowSize), supportMessagesRefreshMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [apiBase, fetchApi, messageWindowSize, selectedId, supportMessagesRefreshMs, token]);

  useEffect(() => {
    const viewport = messagesRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  async function handleSend(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!selectedId || !text || sending) return;

    setSending(true);
    setNotice("");
    try {
      const data = await fetchApi(apiBase, "/api/admin/chat-send", token, {
        method: "POST",
        body: {
          conversationId: selectedId,
          text
        }
      });
      setMessages((current) => {
        if (Array.isArray(data.messages)) {
          return data.messages;
        }
        if (data.message) {
          return [...current, data.message];
        }
        return current;
      });
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedId
            ? {
                ...conversation,
                lastMessagePreview: text,
                lastMessageAt: data.message?.createdAt || data.conversation?.lastMessageAt || new Date().toISOString(),
                unreadForAdmin: 0
              }
            : conversation
        )
      );
      setDraft("");
      setError("");
      setNotice("Reply sent successfully.");
    } catch (sendError) {
      setError(sendError.message);
      setNotice("");
    } finally {
      setSending(false);
    }
  }

  async function handleLoadOlder() {
    if (!selectedId || olderBusy || !messageMeta.hasOlder) return;
    const nextLimit = Math.min(messageWindowSize + ADMIN_CHAT_WINDOW_STEP, Math.max(messageWindowSize + ADMIN_CHAT_WINDOW_STEP, messageMeta.totalCount));
    setOlderBusy(true);
    setNotice("");
    try {
      const query = new URLSearchParams({ conversationId: selectedId, limit: String(nextLimit) });
      const data = await fetchApi(apiBase, `/api/admin/chat-messages?${query.toString()}`, token);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setMessageWindowSize(nextLimit);
      setMessageMeta({
        totalCount: Number(data.pagination?.totalCount || (Array.isArray(data.messages) ? data.messages.length : 0)),
        hasOlder: Boolean(data.pagination?.hasOlder),
        limit: Number(data.pagination?.limit || nextLimit)
      });
      setError("");
      setNotice("Older messages loaded.");
    } catch (loadError) {
      setError(loadError.message || "Unable to load older messages.");
      setNotice("");
    } finally {
      setOlderBusy(false);
    }
  }

  async function handleLoadMoreConversations() {
    if (listBusy || !conversationMeta.hasMore) return;
    setListBusy(true);
    setNotice("");
    try {
      const query = new URLSearchParams({
        limit: String(conversationMeta.limit || ADMIN_CONVERSATION_PAGE_SIZE),
        offset: String((conversationMeta.offset || 0) + (conversationMeta.limit || ADMIN_CONVERSATION_PAGE_SIZE)),
        filter: inboxFilter,
        search: search.trim()
      });
      const data = await fetchApi(apiBase, `/api/admin/chat-conversations?${query.toString()}`, token);
      const normalizedResponse = normalizeConversationListResponse(data);
      setConversations((current) => [
        ...current,
        ...normalizedResponse.items.filter((item) => !current.some((existing) => existing.id === item.id))
      ]);
      setConversationMeta(normalizedResponse.pagination);
      setError("");
      setNotice("Older conversations loaded.");
    } catch (loadError) {
      setError(loadError.message || "Unable to load more conversations.");
      setNotice("");
    } finally {
      setListBusy(false);
    }
  }

  async function handleStatusChange(status) {
    if (!selectedId || statusBusy) return;
    setStatusBusy(true);
    setNotice("");
    try {
      const data = await fetchApi(apiBase, "/api/admin/chat-status", token, {
        method: "POST",
        body: {
          conversationId: selectedId,
          status
        }
      });
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedId
            ? {
                ...conversation,
                status: data.conversation?.status || status
              }
            : conversation
        )
      );
      setNotice(`Thread marked ${String(status).toLowerCase()}.`);
      setError("");
    } catch (statusError) {
      setError(statusError.message || "Unable to update thread status.");
      setNotice("");
    } finally {
      setStatusBusy(false);
    }
  }

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) || null;
  const filteredConversations = useMemo(
    () =>
      [...conversations].sort((left, right) => {
        const unreadDelta = Number(right.unreadForAdmin || 0) - Number(left.unreadForAdmin || 0);
        if (unreadDelta !== 0) return unreadDelta;
        return new Date(right.lastMessageAt || right.updatedAt || 0).getTime() - new Date(left.lastMessageAt || left.updatedAt || 0).getTime();
      }),
    [conversations]
  );
  const unreadCount = conversations.reduce((sum, conversation) => sum + Number(conversation.unreadForAdmin || 0), 0);
  const waitingCount = conversations.filter((conversation) => isOlderThanMinutes(conversation.lastMessageAt || conversation.updatedAt, 15)).length;
  const recentCount = conversations.filter((conversation) => !isOlderThanMinutes(conversation.lastMessageAt || conversation.updatedAt, 60)).length;
  const resolvedCount = conversations.filter((conversation) => String(conversation.status || "").toUpperCase() === "RESOLVED").length;

  if (loading && !conversations.length && !selectedId) {
    return <PageState title="Support Chat" subtitle="Loading support inbox..." />;
  }

  return (
    <>
      <PageHeader title="Support Chat" subtitle="User app se aane wale real support messages yahan live dikhte hain aur yahin se reply bheja ja sakta hai." />
      <section className="panel">
        <div className="queue-overview-grid">
          <div className="queue-overview-card">
            <span className="queue-overview-kicker">Unread Threads</span>
            <strong>{unreadCount}</strong>
            <p>Fresh user messages jin par admin side se response abhi pending hai.</p>
          </div>
          <div className="queue-overview-card">
            <span className="queue-overview-kicker">Waiting Longer</span>
            <strong>{waitingCount}</strong>
            <p>15 minute se zyada old threads jinko fast response dena chahiye.</p>
          </div>
          <div className="queue-overview-card">
            <span className="queue-overview-kicker">Active This Hour</span>
            <strong>{recentCount}</strong>
            <p>Recent conversations jahan operator ko real-time inbox feel milna chahiye.</p>
          </div>
          <div className="queue-overview-card">
            <span className="queue-overview-kicker">Resolved Queue</span>
            <strong>{resolvedCount}</strong>
            <p>Resolved chats 10 din tak rahengi, uske baad automatically delete ho jayengi.</p>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="mini-stats">
          {[
            miniStat("Conversations", conversations.length),
            miniStat("Unread", unreadCount),
            miniStat("Open Thread", selectedConversation?.userName || "None"),
            miniStat("Resolved", resolvedCount)
          ]}
        </div>
      </section>
      <section className="panel">
        <div className="support-layout">
          <div className="support-list">
            <div className="support-list-head">
              <h3>Conversations</h3>
              <span>{filteredConversations.length} loaded / {conversationMeta.total || filteredConversations.length} total</span>
            </div>
            <label className="support-search">
              <span>Search Inbox</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="User, phone, last message" />
            </label>
            <div className="filter-pills">
              {[
                { key: "all", label: "All" },
                { key: "unread", label: "Unread" },
                { key: "waiting", label: "Waiting" },
                { key: "recent", label: "Recent" },
                { key: "resolved", label: "Resolved" }
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`filter-pill${inboxFilter === filter.key ? " active" : ""}`}
                  onClick={() => setInboxFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {filteredConversations.length ? (
              <div className="support-list-items">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`support-item${conversation.id === selectedId ? " active" : ""}`}
                    onClick={() => {
                      setSelectedId(conversation.id);
                      setMessageWindowSize(ADMIN_CHAT_WINDOW_SIZE);
                      setMessageMeta({ totalCount: 0, hasOlder: false, limit: ADMIN_CHAT_WINDOW_SIZE });
                      setNotice("");
                    }}
                  >
                    <div className="support-item-head">
                      <strong>{conversation.userName || "Unknown user"}</strong>
                      <span>{formatDate(conversation.lastMessageAt || conversation.updatedAt)}</span>
                    </div>
                    <div className="support-item-meta">
                      <span>{conversation.userPhone || "No phone"}</span>
                      {conversation.unreadForAdmin > 0 ? <em>{conversation.unreadForAdmin} new</em> : null}
                    </div>
                    <p>{conversation.lastMessagePreview || "Conversation started"}</p>
                    <small>{formatRelativeAge(conversation.lastMessageAt || conversation.updatedAt)}</small>
                    {conversation.resolvedAt ? <small>Auto delete after 10 days from {formatDate(conversation.resolvedAt)}</small> : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="message">{conversations.length ? "Current search me koi conversation match nahi hui." : "Abhi tak koi support conversation start nahi hui."}</p>
            )}
            {conversationMeta.hasMore ? (
              <div className="actions" style={{ marginTop: 12 }}>
                <button type="button" className="secondary" disabled={listBusy} onClick={() => void handleLoadMoreConversations()}>
                  {listBusy ? "Loading..." : `Load More (${Math.max((conversationMeta.total || 0) - conversations.length, 0)} left)`}
                </button>
              </div>
            ) : null}
          </div>

          <div className="support-thread">
            {selectedConversation ? (
              <>
                <div className="support-thread-head">
                  <div>
                    <h3>{selectedConversation.userName || "Unknown user"}</h3>
                    <p>{selectedConversation.userPhone || "No phone"} | {selectedConversation.userId || "-"}</p>
                  </div>
                  <span className="support-thread-status">{selectedConversation.status || "open"}</span>
                </div>
                <div className="support-status-actions">
                  {["OPEN", "PENDING", "RESOLVED"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`filter-pill${String(selectedConversation.status || "").toUpperCase() === status ? " active" : ""}`}
                      disabled={statusBusy}
                      onClick={() => void handleStatusChange(status)}
                    >
                      {statusBusy && String(selectedConversation.status || "").toUpperCase() === status ? "Saving..." : status}
                    </button>
                  ))}
                </div>
                <div className="support-thread-summary">
                  <div className="support-thread-stat">
                    <span>Last activity</span>
                    <strong>{formatRelativeAge(selectedConversation.lastMessageAt || selectedConversation.updatedAt)}</strong>
                  </div>
                  <div className="support-thread-stat">
                    <span>Loaded / Total</span>
                    <strong>{messages.length} / {messageMeta.totalCount || messages.length}</strong>
                  </div>
                  <div className="support-thread-stat">
                    <span>Unread on admin</span>
                    <strong>{selectedConversation.unreadForAdmin || 0}</strong>
                  </div>
                  <div className="support-thread-stat">
                    <span>Resolved on</span>
                    <strong>{selectedConversation.resolvedAt ? formatDate(selectedConversation.resolvedAt) : "-"}</strong>
                  </div>
                </div>

                <div className="support-messages" ref={messagesRef}>
                  {messageMeta.hasOlder ? (
                    <div className="actions" style={{ marginBottom: 12 }}>
                      <button type="button" className="secondary" onClick={() => void handleLoadOlder()} disabled={olderBusy}>
                        {olderBusy ? "Loading..." : `Load Older (${Math.max((messageMeta.totalCount || 0) - messages.length, 0)} left)`}
                      </button>
                    </div>
                  ) : null}
                  {messages.length ? messages.map((message) => {
                    const isAdmin = message.senderRole === "support" || message.senderRole === "admin";
                    return (
                      <article key={message.id} className={`support-bubble${isAdmin ? " admin" : " user"}`}>
                        <header>
                          <strong>{isAdmin ? "Support" : selectedConversation.userName || "User"}</strong>
                          <span>{formatDate(message.createdAt)}</span>
                        </header>
                        <p>{message.text}</p>
                      </article>
                    );
                  }) : (
                    <p className="message">Is conversation me abhi koi message nahi hai.</p>
                  )}
                </div>

                <form className="support-reply-form" onSubmit={handleSend}>
                  <div className="support-canned">
                    <span>Quick Replies</span>
                    <div className="support-canned-list">
                      {supportCannedReplies.map((reply) => (
                        <button
                          key={reply}
                          type="button"
                          className="secondary"
                          onClick={() => setDraft(reply)}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label>
                    <span>Reply message</span>
                    <textarea
                      rows={4}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="User ko yahan se direct reply bhejiye..."
                    />
                  </label>
                  <div className="actions">
                    <button type="submit" className="primary" disabled={sending || !draft.trim()}>
                      {sending ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="support-empty">
                <h3>Select a conversation</h3>
                <p>User app me jab koi message bhejega to yahan thread open ho jayega.</p>
              </div>
            )}
          </div>
        </div>
        <p className={`message ${error ? "error" : notice ? "success" : ""}`}>{error || notice || "Auto refresh har 5 second me chal raha hai."}</p>
      </section>
    </>
  );
}
