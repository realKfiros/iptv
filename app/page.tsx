"use client";

import { observer } from "mobx-react-lite";
import styled from "styled-components";
import iptvStore from "@/stores/iptvStore";
import Player from "@/components/Player";

const Page = styled.main`
    min-height: 100vh;
    display: grid;
    grid-template-columns: 340px 1fr;
    background: #0f1115;
    color: #fff;
`;

const Sidebar = styled.aside`
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1rem;
    overflow: auto;
`;

const Content = styled.section`
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const Card = styled.div`
    background: #171a21;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1rem;
`;

const Tabs = styled.div`
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
`;

const TabButton = styled.button<{ $active: boolean }>`
    border: 0;
    border-radius: 10px;
    padding: 0.7rem 0.9rem;
    cursor: pointer;
    background: ${({ $active }) => ($active ? "#2d6cdf" : "#242936")};
    color: #fff;
`;

const Input = styled.input`
    width: 100%;
    padding: 0.85rem 1rem;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: #0f1115;
    color: #fff;
`;

const Button = styled.button`
    border: 0;
    border-radius: 10px;
    padding: 0.85rem 1rem;
    cursor: pointer;
    background: #2d6cdf;
    color: #fff;
    font-weight: 600;
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const CategoryList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
`;

const CategoryButton = styled.button<{ $active: boolean }>`
    border: 0;
    border-radius: 999px;
    padding: 0.55rem 0.85rem;
    cursor: pointer;
    background: ${({ $active }) => ($active ? "#2d6cdf" : "#242936")};
    color: #fff;
`;

const ChannelList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
`;

const ChannelButton = styled.button<{ $active: boolean }>`
    width: 100%;
    text-align: left;
    border: 1px solid ${({ $active }) => ($active ? "#2d6cdf" : "rgba(255,255,255,0.08)")};
    border-radius: 12px;
    padding: 0.85rem;
    cursor: pointer;
    background: ${({ $active }) => ($active ? "rgba(45,108,223,0.2)" : "#171a21")};
    color: #fff;
`;

const PlayerWrap = styled.div`
    aspect-ratio: 16 / 9;
    min-height: 320px;
`;

const ErrorText = styled.p`
    color: #ff7b7b;
`;

const Empty = styled.div`
    display: grid;
    place-items: center;
    height: 100%;
    min-height: 320px;
    border-radius: 16px;
    background: #171a21;
    border: 1px solid rgba(255, 255, 255, 0.08);
`;

const PlaylistForm = observer(() => {
	return (
		<FieldGroup>
			<Input
				placeholder="https://example.com/playlist.m3u"
				value={iptvStore.playlistUrl}
				onChange={(event) => iptvStore.playlistUrl = event.target.value}
			/>
			<Button onClick={iptvStore.loadFromPlaylistUrl} disabled={iptvStore.loading}>
				{iptvStore.loading ? "Loading..." : "Load Playlist"}
			</Button>
		</FieldGroup>
	);
});

const XtreamForm = observer(() => {
	return (
		<FieldGroup>
			<Input
				placeholder="https://server.example.com"
				value={iptvStore.xtreamCredentials.server}
				onChange={(event) => iptvStore.xtreamCredentials.server = event.target.value}
			/>
			<Input
				placeholder="Username"
				value={iptvStore.xtreamCredentials.username}
				onChange={(event) => iptvStore.xtreamCredentials.username = event.target.value}
			/>
			<Input
				type="password"
				placeholder="Password"
				value={iptvStore.xtreamCredentials.password}
				onChange={(event) => iptvStore.xtreamCredentials.password = event.target.value}
			/>
			<Button onClick={iptvStore.loadFromXtream} disabled={iptvStore.loading}>
				{iptvStore.loading ? "Logging in..." : "Login with Xtream"}
			</Button>
		</FieldGroup>
	);
});

const HomePage = observer(function HomePage() {
	return (
		<Page>
			<Sidebar>
				<Card>
					<Tabs>
						<TabButton
							$active={iptvStore.sourceType === "playlist"}
							onClick={() => iptvStore.sourceType = "playlist"}
						>
							Playlist
						</TabButton>
						<TabButton
							$active={iptvStore.sourceType === "xtream"}
							onClick={() => iptvStore.sourceType = "xtream"}
						>
							Xtream
						</TabButton>
					</Tabs>

					{iptvStore.sourceType === "playlist" ? <PlaylistForm /> : <XtreamForm />}

					{iptvStore.error ? <ErrorText>{iptvStore.error}</ErrorText> : null}
				</Card>

				{iptvStore.channels.length > 0 ? (
					<>
						<Card>
							<CategoryList>
								{iptvStore.visibleCategories.map((category) => (
									<CategoryButton
										key={category.id}
										$active={iptvStore.selectedCategoryId === category.id}
										onClick={() => iptvStore.selectedCategoryId = category.id}
									>
										{category.name}
									</CategoryButton>
								))}
							</CategoryList>
						</Card>

						<ChannelList>
							{iptvStore.filteredChannels.map((channel) => (
								<ChannelButton
									key={channel.id}
									$active={iptvStore.selectedChannel?.id === channel.id}
									onClick={() => iptvStore.selectedChannel = channel}
								>
									<div>{channel.name}</div>
									{channel.categoryName ? (
										<small style={{ opacity: 0.7 }}>{channel.categoryName}</small>
									) : null}
								</ChannelButton>
							))}
						</ChannelList>
					</>
				) : null}
			</Sidebar>

			<Content>
				<Card>
					<h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>IPTV Player</h1>
					<p style={{ margin: 0, opacity: 0.75 }}>
						Load a playlist or login with Xtream, then pick a channel.
					</p>
				</Card>

				{iptvStore.selectedChannel ? (
					<>
						<Card>
							<h2 style={{ marginTop: 0 }}>{iptvStore.selectedChannel.name}</h2>
							<PlayerWrap>
								<Player src={iptvStore.selectedChannel.streamUrl} />
							</PlayerWrap>
						</Card>
					</>
				) : (
					<Empty>Select a playlist and choose a channel.</Empty>
				)}
			</Content>
		</Page>
	);
});

export default HomePage;