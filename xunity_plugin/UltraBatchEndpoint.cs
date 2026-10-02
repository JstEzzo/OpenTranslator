using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using XUnity.AutoTranslator.Plugin.Core.Endpoints;
using XUnity.AutoTranslator.Plugin.Core.Endpoints.Http;
using XUnity.AutoTranslator.Plugin.Core.Web;

namespace UltraBatch
{
   /// <summary>
   /// XUnity AutoTranslator v5.5.2 batch HTTP endpoint.
   ///
   /// Sends the whole batch of untranslated texts to a local server as
   ///     POST http://127.0.0.1:7861/xbatch
   ///     Content-Type: application/json
   ///     { "texts": ["a","b","c"] }
   /// and expects back a plain JSON array of strings, same length / same order:
   ///     ["trad_a","trad_b","trad_c"]
   ///
   /// API verified against bbepis/XUnity.AutoTranslator tag v5.5.2:
   ///   - HttpEndpoint (abstract) implements ITranslateEndpoint.
   ///   - OnCreateRequest(IHttpRequestCreationContext): context.UntranslatedTexts (string[]),
   ///     context.Complete(XUnityWebRequest).
   ///   - OnExtractTranslation(IHttpTranslationExtractionContext): context.Response.Data (string),
   ///     context.Complete(string[]) where indices MUST match UntranslatedTexts indices.
   ///
   /// JSON strategy: NO external dependency. We hand-build the request body
   /// (escaping each input string) and hand-parse the flat output array with a
   /// tiny tolerant tokenizer below. This avoids vendoring SimpleJSON.cs and keeps
   /// the whole endpoint in a single file. (If you prefer SimpleJSON instead, see
   /// the notes in the report.)
   /// </summary>
   public class UltraBatchEndpoint : HttpEndpoint
   {
      private const string DefaultUrl = "http://127.0.0.1:7861/xbatch";

      private string _url = DefaultUrl;

      public override string Id => "UltraBatch";

      public override string FriendlyName => "Ultra Batch (local)";

      // How many concurrent Translate coroutines may be in flight.
      public override int MaxConcurrency => 4;

      // Max number of texts packed into a single /xbatch request.
      public override int MaxTranslationsPerRequest => 50;

      public override void Initialize( IInitializationContext context )
      {
         // Allow overriding the URL from AutoTranslatorConfig.ini, e.g.:
         //   [UltraBatch]
         //   Url=http://127.0.0.1:7861/xbatch
         _url = context.GetOrCreateSetting( "UltraBatch", "Url", DefaultUrl );
         if( string.IsNullOrEmpty( _url ) ) _url = DefaultUrl;

         // v0.38.3 — CRITICAL for live latency. XUnity waits TranslationDelay
         // seconds (a real WaitForSecondsRealtime) AFTER a line appears and BEFORE
         // firing the request. The default is 0.9s, so without this every new line
         // takes ~1s. The built-in CustomTranslate endpoint avoids this via
         // [Custom] EnableShortDelay=True -> SetTranslationDelay(0.1f); a custom
         // endpoint must call SetTranslationDelay itself. 0.1f is XUnity's hard
         // floor. This restores Phase-1 snappiness (~0.3-0.5s) while KEEPING batch
         // for bursts (skip/fast-forward, menus, backlog). Tunable without a
         // recompile via [UltraBatch] TranslationDelay=.
         float delay = 0.1f;
         try { delay = context.GetOrCreateSetting( "UltraBatch", "TranslationDelay", 0.1f ); }
         catch { delay = 0.1f; }
         if( delay < 0.1f ) delay = 0.1f;   // SetTranslationDelay throws below 0.1
         try { context.SetTranslationDelay( delay ); }
         catch { /* older/newer signatures: ignore if unavailable */ }

         // Local server: no TLS, no need to throttle. DisableSpamChecks does NOT
         // reduce latency, but it prevents XUA's auto-shutdown when a burst (4x50)
         // exceeds MaxTranslationsQueuedPerSecond. Keep it.
         try
         {
            context.DisableSpamChecks();
         }
         catch { /* older/newer signatures: ignore if unavailable */ }
      }

      public override void OnCreateRequest( IHttpRequestCreationContext context )
      {
         string[] texts = context.UntranslatedTexts;

         // Build {"texts":[ ... ]} by hand.
         var sb = new StringBuilder( 64 + ( texts.Length * 16 ) );
         sb.Append( "{\"texts\":[" );
         for( int i = 0; i < texts.Length; i++ )
         {
            if( i > 0 ) sb.Append( ',' );
            AppendJsonString( sb, texts[ i ] );
         }
         sb.Append( "]}" );

         var request = new XUnityWebRequest( "POST", _url, sb.ToString() );
         request.Headers[ "Content-Type" ] = "application/json";
         request.Headers[ "Accept" ] = "application/json";

         context.Complete( request );
      }

      public override void OnExtractTranslation( IHttpTranslationExtractionContext context )
      {
         string data = context.Response.Data;
         if( data == null )
         {
            context.Fail( "Empty response from UltraBatch server." );
            return;
         }

         List<string> parsed;
         try
         {
            parsed = ParseJsonStringArray( data );
         }
         catch( Exception e )
         {
            context.Fail( "Failed to parse UltraBatch response as a JSON string array: " + data, e );
            return;
         }

         int expected = context.UntranslatedTexts.Length;
         if( parsed.Count != expected )
         {
            context.Fail(
               "UltraBatch length mismatch: server returned " + parsed.Count +
               " translations but " + expected + " were requested. Response: " + data );
            return;
         }

         // Indices already match UntranslatedTexts order.
         context.Complete( parsed.ToArray() );
      }

      // ------------------------------------------------------------------
      // Minimal, dependency-free JSON helpers
      // ------------------------------------------------------------------

      /// <summary>Appends a properly-escaped JSON string literal (with quotes).</summary>
      private static void AppendJsonString( StringBuilder sb, string s )
      {
         sb.Append( '"' );
         if( s != null )
         {
            for( int i = 0; i < s.Length; i++ )
            {
               char c = s[ i ];
               switch( c )
               {
                  case '"': sb.Append( "\\\"" ); break;
                  case '\\': sb.Append( "\\\\" ); break;
                  case '\b': sb.Append( "\\b" ); break;
                  case '\f': sb.Append( "\\f" ); break;
                  case '\n': sb.Append( "\\n" ); break;
                  case '\r': sb.Append( "\\r" ); break;
                  case '\t': sb.Append( "\\t" ); break;
                  default:
                     if( c < 0x20 )
                        sb.Append( "\\u" ).Append( ( (int)c ).ToString( "x4" ) );
                     else
                        sb.Append( c );
                     break;
               }
            }
         }
         sb.Append( '"' );
      }

      /// <summary>
      /// Parses a flat JSON array of strings: ["a","b\n","c"] -> List{ "a", "b\n", "c" }.
      /// Tolerant of surrounding whitespace. Only supports string elements (and null,
      /// which becomes ""), which is exactly the documented /xbatch contract.
      /// </summary>
      private static List<string> ParseJsonStringArray( string json )
      {
         var result = new List<string>();
         int i = 0;
         int n = json.Length;

         SkipWs( json, ref i );
         if( i >= n || json[ i ] != '[' )
            throw new FormatException( "Expected '[' at start of array." );
         i++; // consume '['

         SkipWs( json, ref i );
         if( i < n && json[ i ] == ']' )
            return result; // empty array

         while( i < n )
         {
            SkipWs( json, ref i );

            // null -> ""
            if( i + 4 <= n && json[ i ] == 'n' && json.Substring( i, 4 ) == "null" )
            {
               result.Add( "" );
               i += 4;
            }
            else if( i < n && json[ i ] == '"' )
            {
               result.Add( ParseJsonString( json, ref i ) );
            }
            else
            {
               throw new FormatException( "Expected string or null at index " + i + "." );
            }

            SkipWs( json, ref i );
            if( i >= n )
               throw new FormatException( "Unterminated array." );

            char c = json[ i ];
            if( c == ',' ) { i++; continue; }
            if( c == ']' ) { i++; break; }
            throw new FormatException( "Expected ',' or ']' at index " + i + "." );
         }

         return result;
      }

      private static void SkipWs( string s, ref int i )
      {
         while( i < s.Length )
         {
            char c = s[ i ];
            if( c == ' ' || c == '\t' || c == '\r' || c == '\n' ) i++;
            else break;
         }
      }

      /// <summary>Parses a JSON string literal starting at s[i]=='"'. Advances i past closing quote.</summary>
      private static string ParseJsonString( string s, ref int i )
      {
         // s[i] == '"'
         i++; // consume opening quote
         var sb = new StringBuilder();
         int n = s.Length;
         while( i < n )
         {
            char c = s[ i++ ];
            if( c == '"' )
               return sb.ToString();

            if( c == '\\' )
            {
               if( i >= n ) break;
               char e = s[ i++ ];
               switch( e )
               {
                  case '"': sb.Append( '"' ); break;
                  case '\\': sb.Append( '\\' ); break;
                  case '/': sb.Append( '/' ); break;
                  case 'b': sb.Append( '\b' ); break;
                  case 'f': sb.Append( '\f' ); break;
                  case 'n': sb.Append( '\n' ); break;
                  case 'r': sb.Append( '\r' ); break;
                  case 't': sb.Append( '\t' ); break;
                  case 'u':
                     if( i + 4 > n ) throw new FormatException( "Bad \\u escape." );
                     int code = Convert.ToInt32( s.Substring( i, 4 ), 16 );
                     sb.Append( (char)code );
                     i += 4;
                     break;
                  default:
                     sb.Append( e );
                     break;
               }
            }
            else
            {
               sb.Append( c );
            }
         }
         throw new FormatException( "Unterminated string literal." );
      }
   }
}
