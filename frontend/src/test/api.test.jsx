import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from '../api.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerUser', () => {
    it('successfully registers a user', async () => {
      const mockResponse = { user: { id: 1, username: 'testuser' }, token: 'fake-token' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.registerUser('testuser', 'test@example.com', 'password123');

      expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/register'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'testuser', email: 'test@example.com', password: 'password123' }),
          })
      );
      expect(result).toEqual(mockResponse);
    });

    it('throws error on registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Username already exists' }),
      });

      await expect(api.registerUser('testuser', 'test@example.com', 'password123'))
          .rejects.toThrow('Username already exists');
    });
  });

  describe('loginUser', () => {
    it('successfully logs in a user', async () => {
      const mockResponse = { user: { id: 1, username: 'testuser' }, token: 'fake-token' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.loginUser('testuser', 'password123');

      expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ identifier: 'testuser', password: 'password123' }),
          })
      );
      expect(result).toEqual(mockResponse);
    });

    it('throws error on login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid credentials' }),
      });

      await expect(api.loginUser('testuser', 'wrongpassword'))
          .rejects.toThrow('Invalid credentials');
    });
  });

  describe('fetchCurrentUser', () => {
    it('fetches current user with valid token', async () => {
      localStorage.setItem('token', 'valid-token');
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const result = await api.fetchCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/me'),
          expect.objectContaining({
            headers: { Authorization: 'Bearer valid-token' },
          })
      );
      expect(result).toEqual(mockUser);
    });

    it('throws error when no token exists', async () => {
      await expect(api.fetchCurrentUser()).rejects.toThrow('Not authenticated');
    });

    it('throws error on failed fetch', async () => {
      localStorage.setItem('token', 'invalid-token');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid token' }),
      });

      await expect(api.fetchCurrentUser()).rejects.toThrow('Invalid token');
    });
  });

  describe('fetchTagGroups', () => {
    it('fetches tag groups successfully', async () => {
      const mockGroups = {
        groups: [
          { id: 'vision', label: 'Vision', tags: ['High Contrast', 'Large Text'] },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGroups,
      });

      const result = await api.fetchTagGroups();

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/tag-groups'));
      expect(result).toEqual(mockGroups);
    });

    it('throws error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(api.fetchTagGroups()).rejects.toThrow('Unable to load tag groups');
    });
  });

  describe('fetchGames', () => {
    it('fetches games successfully', async () => {
      const mockGames = [
        { id: 1, title: 'Game 1', rating: 4.5 },
        { id: 2, title: 'Game 2', rating: 4.0 },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGames,
      });

      const result = await api.fetchGames();

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/games'));
      expect(result).toEqual(mockGames);
    });

    it('throws error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(api.fetchGames()).rejects.toThrow('Unable to load games');
    });
  });

  describe('searchGames', () => {
    it('searches games with query string', async () => {
      const mockResults = [{ id: 1, title: 'Puzzle Game' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await api.searchGames({ q: 'puzzle' });

      expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/games/search?q=puzzle')
      );
      expect(result).toEqual(mockResults);
    });

    it('searches games with tags', async () => {
      const mockGames = [
        { id: 1, title: 'Accessible Game 1' },
        { id: 2, title: 'Accessible Game 2' }
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGames
      });

      const result = await api.searchGames({ tags: ['Vision', 'Motor'] });

      // URL encoding converts comma to %2C
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/games/search?tags=Vision%2CMotor')
      );
      expect(result).toEqual(mockGames);
    });
      it('searches games with both query and tags', async () => {
        const mockResults = [{ id: 1, title: 'Puzzle Game' }];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResults,
        });

        const result = await api.searchGames({ q: 'puzzle', tags: ['Vision'] });

        const fetchCall = mockFetch.mock.calls[0][0];
        expect(fetchCall).toContain('/games/search');
        expect(fetchCall).toContain('q=puzzle');
        expect(fetchCall).toContain('tags=Vision');
        expect(result).toEqual(mockResults);
      });

      it('handles empty search parameters', async () => {
        const mockResults = [];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResults,
        });

        const result = await api.searchGames();

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/games/search')
        );
        expect(result).toEqual(mockResults);
      });
    });

    describe('getGame', () => {
      it('fetches a single game by ID', async () => {
        const mockGame = { id: 1, title: 'Test Game', rating: 4.5 };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockGame,
        });

        const result = await api.getGame(1);

        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/games/1'));
        expect(result).toEqual(mockGame);
      });
    });

  describe('followGame', () => {
    it('follows a game successfully', async () => {
      localStorage.setItem('token', 'valid-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Followed' })
      });

      const result = await api.followGame(1, 123); // userId, gameId

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1/follow/123'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      );
      expect(result).toEqual({ message: 'Followed' });
    });
  });

  describe('unfollowGame', () => {
    it('unfollows a game successfully', async () => {
      localStorage.setItem('token', 'valid-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Unfollowed' })
      });

      const result = await api.unfollowGame(1, 123); // userId, gameId

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1/follow/123'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      );
      expect(result).toEqual({ message: 'Unfollowed' });
    });
  });

  describe('getFollowedGames', () => {
    it('fetches followed games successfully', async () => {
      localStorage.setItem('token', 'valid-token');
      const mockFollowedGames = [{ id: 1, title: 'Game 1' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFollowedGames
      });

      const result = await api.getFollowedGames(1); // userId

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1/followed-games'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      );
      expect(result).toEqual(mockFollowedGames);
    });
  });

    describe('updateAccessibilityPreferences', () => {
      it('updates preferences successfully', async () => {
        localStorage.setItem('token', 'valid-token');
        const preferences = { visual: true, motor: false };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Updated' })
      });

      const result = await api.updateAccessibilityPreferences(1, preferences); // userId, prefs

          expect(mockFetch).toHaveBeenCalledWith(
              expect.stringContaining('/users/1/accessibility-preferences'),
              expect.objectContaining({
                method: 'PATCH',
                headers: expect.objectContaining({
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer valid-token'
                }),
                body: JSON.stringify(preferences)
              })
          );
          expect(result).toEqual({ message: 'Updated' });
        });
      });

      describe('getAccessibilityPreferences', () => {
        it('fetches preferences successfully', async () => {
          localStorage.setItem('token', 'valid-token');
          const mockPreferences = { visual: true, motor: false };
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockPreferences
          });

          const result = await api.getAccessibilityPreferences(1); // userId

          expect(mockFetch).toHaveBeenCalledWith(
              expect.stringContaining('/users/1/accessibility-preferences'),
              expect.objectContaining({
                headers: expect.objectContaining({
                  'Authorization': 'Bearer valid-token'
                })
              })
          );
          expect(result).toEqual(mockPreferences);
      });
    });

    describe('createReviewForGame', () => {
      it('creates a review successfully', async () => {
        localStorage.setItem('token', 'valid-token');
        const reviewData = { rating: 5, comment: 'Great game!' };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, ...reviewData })
        });

        const result = await api.createReviewForGame(1, reviewData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/games/1/reviews'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer valid-token'
            }),
            body: JSON.stringify(reviewData)
          })
        );
        expect(result).toEqual({ id: 1, ...reviewData });
      });
    });

        describe('getReviewsForGame', () => {
          it('fetches reviews for a game', async () => {
            const mockReviews = [
              { id: 1, rating: 5, comment: 'Great!' },
              { id: 2, rating: 4, comment: 'Good' },
            ];
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => mockReviews,
            });

            const result = await api.getReviewsForGame(1);

            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/games/1/reviews'));
            expect(result).toEqual(mockReviews);
          });
        });

        describe('reportGame', () => {
          it('reports a game successfully', async () => {
            localStorage.setItem('token', 'valid-token');
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 201,
            });

            const result = await api.reportGame(1, 'Inappropriate content');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/games/1/reports'),
                expect.objectContaining({
                  method: 'POST',
                  body: JSON.stringify({ message: 'Inappropriate content' }),
                })
            );
            expect(result).toEqual({ ok: true, status: 201 });
          });
        });

        describe('getGameReports', () => {
          it('fetches game reports successfully', async () => {
            localStorage.setItem('token', 'valid-token');
            const mockReports = [
              { id: 1, game_id: 1, message: 'Report 1' },
              { id: 2, game_id: 2, message: 'Report 2' },
            ];
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => mockReports,
            });

            const result = await api.getGameReports();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/games/reports'),
                expect.objectContaining({
                  headers: expect.objectContaining({
                    Authorization: 'Bearer valid-token',
                  }),
                })
            );
            expect(result).toEqual(mockReports);
          });
        });

        describe('resolveGameReport', () => {
          it('resolves a game report successfully', async () => {
            localStorage.setItem('token', 'valid-token');
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
            });

            const result = await api.resolveGameReport(1);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/games/reports/1'),
                expect.objectContaining({
                  method: 'PATCH',
                })
            );
            expect(result).toEqual({ ok: true, status: 200 });
          });
        });

        describe('deleteGame', () => {
          it('deletes a game successfully', async () => {
            localStorage.setItem('token', 'valid-token');
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 204,
            });

            const result = await api.deleteGame(1);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/games/1'),
                expect.objectContaining({
                  method: 'DELETE',
                })
            );
            expect(result).toEqual({ ok: true, status: 204 });
          });
        });

        describe('getGames', () => {
          it('fetches all games successfully', async () => {
            const mockGames = [
              { id: 1, title: 'Game 1' },
              { id: 2, title: 'Game 2' },
            ];
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => mockGames,
            });

            const result = await api.getGames();

            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/games'));
            expect(result).toEqual(mockGames);
          });
        });

        describe('fetchUserReviews', () => {
          it('fetches user reviews successfully', async () => {
            localStorage.setItem('token', 'valid-token');
            const mockReviews = [
              { id: 1, rating: 5, comment: 'Great!' },
              { id: 2, rating: 4, comment: 'Good' },
            ];
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => mockReviews,
            });

            const result = await api.fetchUserReviews(1);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/users/1/reviews'),
                expect.objectContaining({
                  headers: expect.objectContaining({
                    Authorization: 'Bearer valid-token',
                  }),
                })
            );
            expect(result).toEqual(mockReviews);
          });
        });

        describe('updateUserProfile', () => {
          it('updates user profile successfully', async () => {
            localStorage.setItem('token', 'valid-token');
            const profileData = { username: 'newname', email: 'new@example.com' };
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({ ...profileData, id: 1 }),
            });

            const result = await api.updateUserProfile(1, profileData);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/users/1'),
                expect.objectContaining({
                  method: 'PATCH',
                  body: JSON.stringify(profileData),
                })
            );
            expect(result).toEqual({ ...profileData, id: 1 });
          });
        });

        describe('changeUserPassword', () => {
          it('changes user password successfully', async () => {
            localStorage.setItem('token', 'valid-token');
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({ message: 'Password changed' }),
            });

            const result = await api.changeUserPassword(1, 'oldpass', 'newpass');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/users/1/password'),
                expect.objectContaining({
                  method: 'PATCH',
                  body: JSON.stringify({ currentPassword: 'oldpass', newPassword: 'newpass' }),
                })
            );
            expect(result).toEqual({ message: 'Password changed' });
      });
    });

  describe('authHeaders', () => {
    it('returns authorization header when token exists', () => {
      localStorage.setItem('token', 'test-token');
      const headers = api.authHeaders();
      expect(headers).toEqual({ Authorization: 'Bearer test-token' });
    });

    it('returns empty object when no token exists', () => {
      localStorage.clear();
      const headers = api.authHeaders();
      expect(headers).toEqual({});
    });
  });
});
